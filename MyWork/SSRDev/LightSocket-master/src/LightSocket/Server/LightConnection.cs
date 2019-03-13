using LightSocket.Packet;
using System;
using System.Net.Sockets;
using LightSocket.Extensions;
using System.Net;
using LightSocket.Common;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Concurrent;

namespace LightSocket.Server
{
    public class LightConnection<T> : IDisposable where T : IPacket, new()
    {
        #region Nested struct
        internal class SendWrapper
        {
            internal LightConnection<T> Connection { get; set; }

            internal T Packet { get; set; }
        }
        #endregion

        #region Fields
        CancellationTokenSource sendLoopCts;
        readonly AutoResetEvent sendAutoEvent = new AutoResetEvent(false);
        readonly AutoResetEvent sendQueueAutoEvent = new AutoResetEvent(false);
        readonly ConcurrentQueue<T> sendQueue = new ConcurrentQueue<T>();
        #endregion

        #region Events
        public event EventHandler<T> Received;

        public event EventHandler<T> Sent;

        public event EventHandler Disconnected;
        #endregion

        #region Constructor
        public LightConnection(LightServer<T> server, Socket socket)
        {
            Id = Guid.NewGuid();
            Server = server;
            Socket = socket;

            using (var packet = new T())
                Packetizer = packet.CreatePacketizer();

            StartSendLoop();
        }
        #endregion

        #region Properties
        public LightServer<T> Server { get; private set; }

        internal protected Socket Socket { get; private set; }

        public Guid Id { get; private set; }

        public EndPoint EndPoint
        {
            get
            {
                return Socket.RemoteEndPoint;
            }
        }

        protected IPacketizer Packetizer { get; set; }
        #endregion

        #region Receive
        internal protected virtual void StartReceiveChain(SocketAsyncEventArgs e)
        {
            if (!Server.IsRunning)
                return;

            e.UserToken = this;

            if (!Socket.ReceiveAsync(e))
                ProcessReceive(e);
        }

        internal protected virtual void ProcessReceive(SocketAsyncEventArgs e)
        {
            var connection = (LightConnection<T>)e.UserToken;

            if (e.SocketError == SocketError.Success && e.BytesTransferred > 0)
            {
                var packets = Packetizer.ReadPackets(e);

                if (packets != null)
                {
                    foreach (var packet in packets)
                        OnReceive((T)packet);
                }

                StartReceiveChain(e);
            }
            else
            {
                OnDisconnected();

                e.UserToken = null;
                Server.ReceivePool.Return(e);
            }
        }

        protected virtual void OnReceive(T packet)
        {
            Received?.Invoke(this, packet);
        }
        #endregion

        #region Send
        protected virtual void StartSendLoop()
        {
            sendAutoEvent.Reset();
            sendQueueAutoEvent.Reset();

            sendLoopCts = new CancellationTokenSource();

            var ct = sendLoopCts.Token;
            Task.Factory.StartNew(() => SendLoop(ct), ct, TaskCreationOptions.LongRunning, TaskScheduler.Default);
        }

        void SendLoop(CancellationToken ct)
        {
            var sendWrapper = new SendWrapper();
            sendWrapper.Connection = this;

            while (true)
            {
                if (ct.IsCancellationRequested)
                    break;

                T packet;

                if (sendQueue.TryDequeue(out packet))
                {
                    var sendSocketAsyncEventArgs = Server.GetSendSocketAsyncEventArgs();
                    sendWrapper.Packet = packet;
                    sendSocketAsyncEventArgs.UserToken = sendWrapper;

                    if (Packetizer.SetBuffer(sendSocketAsyncEventArgs, packet))
                    {
                        if (Socket.SendAsync(sendSocketAsyncEventArgs))
                            sendAutoEvent.WaitOne(Timeout.Infinite);
                        else
                            ProcessSend(sendSocketAsyncEventArgs);
                    }
                    else
                    {
                        ProcessSend(sendSocketAsyncEventArgs);
                    }
                }
                else
                {
                    sendQueueAutoEvent.WaitOne(Timeout.Infinite);
                }
            }
        }


        public virtual void Send(T packet)
        {
            if (packet == null)
                throw new ArgumentNullException(nameof(packet));

            if (Socket.IsConnected())
            {
                sendQueue.Enqueue(packet);
                sendQueueAutoEvent.Set();
            }
        }

        internal protected virtual void ProcessSend(SocketAsyncEventArgs e)
        {
            if (e.SocketError == SocketError.Success && e.BytesTransferred > 0)
            {
                var wrapper = (SendWrapper)e.UserToken;
                OnSent(wrapper.Packet);
            }
            else
            {
                OnDisconnected();
            }

            sendAutoEvent.Set();

            e.UserToken = null;
            Server.SendPool.Return(e);
        }

        protected virtual void OnSent(T packet)
        {
            Sent?.Invoke(this, packet);
        }
        #endregion

        #region Methods
        protected virtual void OnDisconnected()
        {
            Disconnected?.Invoke(this, EventArgs.Empty);
        }
        #endregion

        #region Dispose
        volatile bool disposed = false;

        /// <summary>
        /// Disposes <see cref="LightConnection"/>
        /// </summary>
        public void Dispose()
        {
            Dispose(true);
            GC.SuppressFinalize(this);
        }

        /// <summary>
        /// Disposing method to override if this class is inherited.
        /// </summary>
        /// <param name="disposing">Whether disposing was called from dipose or not.</param>
        protected virtual void Dispose(bool disposing)
        {
            if (disposed)
                return;

            if (disposing)
            {
                if (Socket != null)
                {
                    try { Socket.Shutdown(SocketShutdown.Both); } catch (Exception) { }
                    Socket.Dispose();
                    Socket = null;
                }

                if (sendLoopCts != null)
                {
                    sendLoopCts.Cancel();
                    sendLoopCts.Dispose();
                    sendLoopCts = null;
                }

                if (sendQueue.Count > 0)
                {
                    T packet;
                    while (sendQueue.TryDequeue(out packet)) { }
                }
            }

            disposed = true;
        }
        #endregion
    }
}
