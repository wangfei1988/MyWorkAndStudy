using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Net.Sockets;
using System.Text;
using System.Threading;

namespace LightSocket.Common
{
    public sealed class SocketAsyncEventArgsPool : IDisposable
    {
        #region Fields
        readonly AutoResetEvent returnedEvent;
        readonly ConcurrentStack<SocketAsyncEventArgs> stack;
        public event EventHandler<SocketAsyncEventArgs> RemovingSocketAsyncEventArgs;
        #endregion

        #region Constructor/Desctructor
        public SocketAsyncEventArgsPool()
        {
            stack = new ConcurrentStack<SocketAsyncEventArgs>();
            returnedEvent = new AutoResetEvent(false);
        }
        #endregion

        #region Properties
        public AutoResetEvent ReturnedEvent => returnedEvent;
        #endregion

        #region Methods
        public SocketAsyncEventArgs Rent()
        {
            return stack.TryPop(out SocketAsyncEventArgs socketAsyncEventArgs) ? socketAsyncEventArgs : null;
        }

        public void Return(SocketAsyncEventArgs socketAsyncEventArgs)
        {
            if (socketAsyncEventArgs == null)
                throw new ArgumentNullException(nameof(socketAsyncEventArgs));

            stack.Push(socketAsyncEventArgs);
            ReturnedEvent.Set();
        }

        public void Clear()
        {
            foreach (var socketAsyncEventArgs in stack)
            {
                RemovingSocketAsyncEventArgs?.Invoke(this, socketAsyncEventArgs);
                socketAsyncEventArgs.Dispose();
            }

            stack.Clear();
        }
        #endregion

        #region Factory Methods
        public static SocketAsyncEventArgs CreateSocketAsyncEventArgs(EventHandler<SocketAsyncEventArgs> completedEventHandler, int receiveBufferLength)
        {
            var socketAsyncEventArgs = new SocketAsyncEventArgs();
            socketAsyncEventArgs.Completed += completedEventHandler;

            if (receiveBufferLength > 0)
                socketAsyncEventArgs.SetBuffer(new byte[receiveBufferLength], 0, receiveBufferLength);

            return socketAsyncEventArgs;
        }
        #endregion

        #region Dispose
        volatile bool disposed;

        private void Dispose(bool disposing)
        {
            if (disposed)
                return;

            if (disposing)
            {
                Clear();
            }

            disposed = true;
        }

        public void Dispose()
        {
            Dispose(true);
            GC.SuppressFinalize(this);
        }
        #endregion
    }
}
