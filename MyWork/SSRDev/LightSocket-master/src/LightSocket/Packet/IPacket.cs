using System;
using System.Collections.Generic;
using System.Text;

namespace LightSocket.Packet
{
    public interface IPacket : IDisposable
    {
        int Length { get; }

        byte[] GetBuffer(out int offset, out int length);

        void Read(byte[] buffer, int offset, int length);

        IPacketizer CreatePacketizer();
    }
}
