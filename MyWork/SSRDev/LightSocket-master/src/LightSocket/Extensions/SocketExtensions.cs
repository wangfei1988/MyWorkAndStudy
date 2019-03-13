using System;
using System.Collections.Generic;
using System.Net.Sockets;
using System.Text;

namespace LightSocket.Extensions
{
    /// <summary>
    /// Extension methods for <see cref="Socket"/>
    /// </summary>
    public static class SocketExtensions
    {
        /// <summary>
        /// Whether or not socket is connected. <see href="https://stackoverflow.com/questions/2661764/how-to-check-if-a-socket-is-connected-disconnected-in-c"/>.
        /// </summary>
        /// <param name="socket">The <see cref="Socket"/></param>
        /// <returns></returns>
        public static bool IsConnected(this Socket socket)
        {
            return socket.Connected && !(socket.Poll(1, SelectMode.SelectRead) && socket.Available == 0);
        }
    }
}
