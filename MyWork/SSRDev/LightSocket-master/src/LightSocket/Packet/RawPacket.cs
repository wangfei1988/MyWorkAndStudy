using System;
using System.Collections.Generic;
using System.Text;

namespace LightSocket.Packet
{
    public struct RawPacket : IPacket
    {
        public byte[] Buffer { get; set; }

        public int Length
        {
            get
            {
                return Buffer == null ? 0 : Buffer.Length;
            }
        }

        public byte[] GetBuffer(out int offset, out int length)
        {
            offset = 0;
            length = Buffer.Length;
            return Buffer;
        }

        public void Read(byte[] buffer, int offset, int length)
        {
            Buffer = new byte[length]; /* TODO: use stackalloc when Span<> is available in netstandart */
            Array.Copy(buffer, 0, Buffer, offset, length);
        }


        public IPacketizer CreatePacketizer()
        {
            return new RawPacketizer();
        }

        #region Dispose
        /// <summary>
        /// Disposes <see cref="RawPacket"/>
        /// </summary>
        public void Dispose() { }
        #endregion
    }
}
