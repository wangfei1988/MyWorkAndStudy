using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using LightSocket.Common;
using LightSocket.Extensions;
using LightSocket.Packet;

namespace LightSocket.Server
{
    public class LightServer : LightServer<RawPacket> { }

    public class LightServer<T> : IDisposable where T : IPacket, new()
    {
        #region Nested class
        public class LighConfiguration
        {
            public IPEndPoint EndPoint { get; set; }

            public int PoolSize { get; set; } = 100;

            public int ReceiveBufferLength { get; set; } = 4096;

            public bool SocketBlocking { get; set; } = false;

            public int SocketListenBacklog { get; set; } = 50;
        }
        #endregion

        #region Fields
        object runningLocker = new object();
        volatile bool isRunning = false;
        #endregion

        #region Events
        public event EventHandler<LightConnection<T>> ClientConnected;

        public event EventHandler<LightConnection<T>> ClientDisconnected;

        public event EventHandler<Exception> Error;
        #endregion

        #region Properties
        protected Socket Socket { get; private set; }

        internal protected SocketAsyncEventArgsPool ReceivePool { get; private set; }

        internal protected SocketAsyncEventArgsPool SendPool { get; private set; }

        protected ConcurrentDictionary<Guid, LightConnection<T>> Connections = new ConcurrentDictionary<Guid, LightConnection<T>>();

        public virtual LighConfiguration Configuration { get; protected set; } = new LighConfiguration();

        public bool IsRunning => isRunning;
        #endregion

        #region Methods
        internal SocketAsyncEventArgs GetSendSocketAsyncEventArgs()
        {
            var socketAsyncEventArgs = SendPool.Rent();

            if (socketAsyncEventArgs == null)
                socketAsyncEventArgs = SocketAsyncEventArgsPool.CreateSocketAsyncEventArgs(SocketAsyncEventArgs_Completed, 0);

            return socketAsyncEventArgs;
        }

        internal SocketAsyncEventArgs GetReceiveSocketAsyncEventArgs()
        {
            var socketAsyncEventArgs = ReceivePool.Rent();

            if (socketAsyncEventArgs == null)
                socketAsyncEventArgs = SocketAsyncEventArgsPool.CreateSocketAsyncEventArgs(SocketAsyncEventArgs_Completed, Configuration.ReceiveBufferLength);

            return socketAsyncEventArgs;
        }

        protected virtual void CheckConfuguration()
        {
            if (Configuration.EndPoint == null)
                throw new InvalidOperationException("Cannot run server without EndPoint.");
        }

        public virtual void Run()
        {
            lock (runningLocker)
            {
                if (isRunning)
                    return;

                CheckConfuguration();

                Socket = new Socket(Configuration.EndPoint.AddressFamily, SocketType.Stream, ProtocolType.Tcp);
                Socket.SetSocketOption(SocketOptionLevel.Socket, SocketOptionName.ReuseAddress, 1);
                Socket.Bind(Configuration.EndPoint);
                Socket.Listen(Configuration.SocketListenBacklog);
                Socket.Blocking = Configuration.SocketBlocking;

                ReceivePool = new SocketAsyncEventArgsPool();
                ReceivePool.RemovingSocketAsyncEventArgs += ReceivePool_RemovingSocketAsyncEventArgs;

                SendPool = new SocketAsyncEventArgsPool();
                SendPool.RemovingSocketAsyncEventArgs += SendPool_RemovingSocketAsyncEventArgs;

                for (int i = 0; i < Configuration.PoolSize; i++)
                {
                    ReceivePool.Return(SocketAsyncEventArgsPool.CreateSocketAsyncEventArgs(SocketAsyncEventArgs_Completed, Configuration.ReceiveBufferLength));
                    SendPool.Return(SocketAsyncEventArgsPool.CreateSocketAsyncEventArgs(SocketAsyncEventArgs_Completed, 0));
                }

                isRunning = true;
                StartAcceptChain(SocketAsyncEventArgsPool.CreateSocketAsyncEventArgs(SocketAsyncEventArgs_Completed, 0));
            }
        }

        public virtual void Stop()
        {
            lock (runningLocker)
            {
                if (!isRunning)
                    return;

                if (Socket != null)
                {
                    try { Socket.Shutdown(SocketShutdown.Both); } catch (Exception) { }
                    Socket.Dispose();
                    Socket = null;
                }

                foreach (var connection in Connections)
                {
                    OnClientDisconnected(connection.Value);
                    connection.Value.Dispose();
                }

                Connections.Clear();
                ReceivePool.Clear();
                SendPool.Clear();

                isRunning = false;
            }
        }

        protected virtual void StartAcceptChain(SocketAsyncEventArgs e)
        {
            if (e.AcceptSocket != null)
                e.AcceptSocket = null;

            if (!isRunning)
                return;

            if (!Socket.AcceptAsync(e))
                ProcessAccept(e);
        }

        protected virtual void ProcessAccept(SocketAsyncEventArgs e)
        {
            try
            {
                if (e.SocketError == SocketError.Success)
                {
                    var receiveSocketAsyncEventArgs = GetReceiveSocketAsyncEventArgs();

                    var connection = CreateConnection(e.AcceptSocket);
                    connection.Disconnected += Connection_Disconnected;

                    if (!Connections.TryAdd(connection.Id, connection))
                        OnError(new InvalidOperationException($"Connection {connection.Id} already exists."));

                    OnClientConnected(connection);

                    connection.StartReceiveChain(receiveSocketAsyncEventArgs);

                    StartAcceptChain(e);
                }
            }
            catch (Exception exception)
            {
                OnError(exception);
            }
        }

        protected virtual LightConnection<T> CreateConnection(Socket socket)
        {
            return new LightConnection<T>(this, socket);
        }

        protected virtual void OnClientConnected(LightConnection<T> connection)
        {
            ClientConnected?.Invoke(this, connection);
        }

        protected virtual void OnClientDisconnected(LightConnection<T> connection)
        {
            if (connection != null)
            {
                ClientDisconnected?.Invoke(this, connection);
                connection.Disconnected -= Connection_Disconnected;
                connection.Dispose();
            }
        }

        protected virtual void OnError(Exception e)
        {
            Error?.Invoke(this, e);
        }
        #endregion

        #region Event Handlers
        void SendPool_RemovingSocketAsyncEventArgs(object sender, SocketAsyncEventArgs e)
        {
            e.Completed -= SocketAsyncEventArgs_Completed;
        }

        void ReceivePool_RemovingSocketAsyncEventArgs(object sender, SocketAsyncEventArgs e)
        {
            e.Completed -= SocketAsyncEventArgs_Completed;
        }

        void SocketAsyncEventArgs_Completed(object sender, SocketAsyncEventArgs e)
        {
            switch (e.LastOperation)
            {
                case SocketAsyncOperation.Accept:
                    ProcessAccept(e);
                    break;
                case SocketAsyncOperation.Receive:
                    var connection = (LightConnection<T>)e.UserToken;
                    connection.ProcessReceive(e);
                    break;
                case SocketAsyncOperation.Send:
                    var wrapper = (LightConnection<T>.SendWrapper)e.UserToken;
                    wrapper.Connection.ProcessSend(e);
                    break;
                default:
                    break;
            }
        }

        void Connection_Disconnected(object sender, EventArgs e)
        {
            OnClientDisconnected((LightConnection<T>)sender);
        }
        #endregion

        #region Dispose
        volatile bool disposed = false;

        /// <summary>
        /// Disposes <see cref="LightServer{LightConnection}"/>
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
                Stop();
            }

            disposed = true;
        }
        #endregion
    }
}
