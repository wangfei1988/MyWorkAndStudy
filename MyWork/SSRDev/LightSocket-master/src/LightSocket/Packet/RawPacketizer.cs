using System;
using System.Collections.Generic;
using System.Net.Sockets;
using System.Text;

namespace LightSocket.Packet
{
    public sealed class RawPacketizer : IPacketizer
    {
        public IEnumerable<IPacket> ReadPackets(SocketAsyncEventArgs e)
        {
            var packet = new RawPacket();
            packet.Read(e.Buffer, 0, e.BytesTransferred);
            return new IPacket[1] { packet };
        }

        public bool SetBuffer(SocketAsyncEventArgs e, IPacket packet)
        {
            int offset, length;
            var buffer = packet.GetBuffer(out offset, out length);

            if (length == 0)
                return false;

            if (buffer == null)
                return false;

            if (offset < 0 || offset >= buffer.Length)
                return false;

            if (length <= 0 || length > buffer.Length)
                return false;

            e.SetBuffer(buffer, 0, buffer.Length);
            return true;
        }

        #region Dispose
        /// <summary>
        /// Disposes <see cref="RawPacketizer"/>
        /// </summary>
        public void Dispose() { }
        #endregion
    }
}
