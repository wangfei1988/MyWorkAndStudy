using System;
using System.Collections.Generic;
using System.Text;

namespace LightSocket.Packet
{
    public struct StringPacket : IPacket
    {
        public StringPacket(Encoding encoding)
        {
            Encoding = encoding;
            Text = null;
        }

        public Encoding Encoding { get; set; }

        public string Text { get; set; }

        public int Length
        {
            get
            {
                return string.IsNullOrEmpty(Text) ? 0 : Encoding.GetByteCount(Text);
            }
        }

        public byte[] GetBuffer(out int offset, out int length)
        {
            offset = 0;

            if (string.IsNullOrEmpty(Text))
            {
                length = 0;
                return new byte[0];
            }

            var buffer = Encoding.GetBytes(Text);
            length = buffer.Length;

            return buffer;

        }

        public void Read(byte[] buffer, int offset, int length)
        {
            Text = Encoding.GetString(buffer, offset, length);
        }

        public IPacketizer CreatePacketizer()
        {
            return new LinePacketizer();
        }

        public void Dispose() { }
    }
}
