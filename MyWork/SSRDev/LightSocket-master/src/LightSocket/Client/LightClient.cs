using System;
using System.Collections.Generic;
using System.Text;
using System.Net.Sockets;
using System.Net;
using LightSocket.Extensions;
using LightSocket.Packet;
using LightSocket.Common;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Concurrent;

namespace LightSocket.Client
{
    public class LightClient : LightClient<RawPacket>
    {

    }

    public class LightClient<T> : IDisposable where T : IPacket, new()
    {
        #region Nested class
        public class LighConfiguration
        {
            public IPEndPoint EndPoint { get; set; }

            public int ReceiveBufferLength { get; set; } = 4096;
        }
        #endregion

        #region Fields
        AutoResetEvent connectEvent = new AutoResetEvent(false);

        CancellationTokenSource sendLoopCts;
        readonly AutoResetEvent sendAutoEvent = new AutoResetEvent(false);
        readonly AutoResetEvent sendQueueAutoEvent = new AutoResetEvent(false);
        readonly ConcurrentQueue<T> sendQueue = new ConcurrentQueue<T>();
        #endregion

        #region Events
        public event EventHandler Connected;

        public event EventHandler<T> Recieved;

        public event EventHandler<T> Sent;

        public event EventHandler Disconnected;

        public event EventHandler<Exception> Error;
        #endregion

        #region Constructor
        public LightClient()
        {
            using (var packet = new T())
            {
                Packetizer = packet.CreatePacketizer();
            }
        }
        #endregion

        #region Properties
        protected Socket Socket { get; set; }

        protected SocketAsyncEventArgs ReceiveSocketAsyncEventArgs { get; private set; }

        protected SocketAsyncEventArgs SendSocketAsyncEventArgs { get; private set; }

        public virtual LighConfiguration Configuration { get; protected set; } = new LighConfiguration();

        protected IPacketizer Packetizer { get; set; }

        public virtual bool IsConnected
        {
            get { return Socket != null && Socket.IsConnected(); }
        }
        #endregion

        #region Methods
        protected virtual void CheckConfuguration()
        {
            if (Configuration.EndPoint == null)
                throw new InvalidOperationException("Cannot run server without EndPoint.");
        }

        public virtual bool Connect()
        {
            if (IsConnected)
                return true;

            CheckConfuguration();

            if (Socket != null)
                Disconnect(); //TODO asi jako release resources

            Socket = new Socket(Configuration.EndPoint.AddressFamily, SocketType.Stream, ProtocolType.Tcp);

            ReceiveSocketAsyncEventArgs = SocketAsyncEventArgsPool.CreateSocketAsyncEventArgs(SocketAsyncEventArgs_Completed, Configuration.ReceiveBufferLength);
            SendSocketAsyncEventArgs = SocketAsyncEventArgsPool.CreateSocketAsyncEventArgs(SocketAsyncEventArgs_Completed, 0);

            var connectSocketAsyncEventArgs = SocketAsyncEventArgsPool.CreateSocketAsyncEventArgs(SocketAsyncEventArgs_Completed, 0);
            connectSocketAsyncEventArgs.RemoteEndPoint = Configuration.EndPoint;

            if (!Socket.ConnectAsync(connectSocketAsyncEventArgs))
                return false;

            connectEvent.WaitOne(Timeout.Infinite);

            if (connectSocketAsyncEventArgs.SocketError == SocketError.Success)
            {
                StartSendLoop();
                StartReceiveChain(ReceiveSocketAsyncEventArgs);
                return true;
            }

            OnError(new SocketException((int)connectSocketAsyncEventArgs.SocketError));

            connectSocketAsyncEventArgs.Completed -= SocketAsyncEventArgs_Completed;

            return false;
        }
        #endregion

        #region Receive
        protected virtual void StartReceiveChain(SocketAsyncEventArgs e)
        {
            if (!Socket.ReceiveAsync(e))
                ProcessReceive(e);
        }

        protected virtual void ProcessReceive(SocketAsyncEventArgs e)
        {
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
            }
        }

        protected virtual void OnReceive(T packet)
        {
            Recieved?.Invoke(this, packet);
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
            while (true)
            {
                if (ct.IsCancellationRequested)
                    break;

                T packet;

                if (sendQueue.TryDequeue(out packet))
                {
                    if (SendSocketAsyncEventArgs != null)
                    {
                        SendSocketAsyncEventArgs.UserToken = packet;
                        if (Packetizer.SetBuffer(SendSocketAsyncEventArgs, packet))
                        {
                            if (Socket.SendAsync(SendSocketAsyncEventArgs))
                                sendAutoEvent.WaitOne(Timeout.Infinite);
                            else
                                ProcessSend(SendSocketAsyncEventArgs);
                        }
                        else
                        {
                            ProcessSend(SendSocketAsyncEventArgs);
                        }
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

            if (IsConnected)
            {
                sendQueue.Enqueue(packet);
                sendQueueAutoEvent.Set();
            }
        }

        protected virtual void ProcessSend(SocketAsyncEventArgs e)
        {
            if (e.SocketError == SocketError.Success && e.BytesTransferred > 0)
            {
                OnSent((T)e.UserToken);
            }
            else
            {
                OnDisconnected();
            }

            sendAutoEvent.Set();
        }

        protected virtual void OnSent(T packet)
        {

            Sent?.Invoke(this, packet);
        }
        #endregion

        #region Methods
        protected virtual void OnError(Exception e)
        {
            Error?.Invoke(this, e);
        }

        public void Disconnect()
        {
            if (Socket != null)
            {
                if (Socket.Connected)
                    Socket.Shutdown(SocketShutdown.Both);

                Socket.Dispose();
                Socket = null;
            }

            if (ReceiveSocketAsyncEventArgs != null)
            {
                ReceiveSocketAsyncEventArgs.Completed -= SocketAsyncEventArgs_Completed;
                ReceiveSocketAsyncEventArgs = null;
            }

            if (SendSocketAsyncEventArgs != null)
            {
                SendSocketAsyncEventArgs.Completed -= SocketAsyncEventArgs_Completed;
                SendSocketAsyncEventArgs = null;
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

        protected virtual void OnConnected()
        {
            Connected?.Invoke(this, EventArgs.Empty);
        }

        protected virtual void OnDisconnected()
        {
            Disconnected?.Invoke(this, EventArgs.Empty);
        }
        #endregion

        #region EventHandlers
        /// <summary>
        /// Triggered when a <see cref="SocketAsyncEventArgs"/> async operation is completed.
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        void SocketAsyncEventArgs_Completed(object sender, SocketAsyncEventArgs e)
        {
            if (sender == null)
                throw new ArgumentNullException(nameof(sender));

            switch (e.LastOperation)
            {
                case SocketAsyncOperation.Connect:
                    if (e.SocketError == SocketError.Success)
                        OnConnected();

                    connectEvent.Set();
                    break;
                case SocketAsyncOperation.Receive:
                    ProcessReceive(e);
                    break;
                case SocketAsyncOperation.Send:
                    ProcessSend(e);
                    break;
                case SocketAsyncOperation.Disconnect:
                    OnDisconnected();
                    break;
                default: throw new InvalidOperationException("Unexpected socket async operation.");
            }
        }
        #endregion

        #region Dispose
        volatile bool disposed = false;

        /// <summary>
        /// Disposes <see cref="LightClient"/>
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
                Disconnect();
            }

            disposed = true;
        }
        #endregion
    }
}