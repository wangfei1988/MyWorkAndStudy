using System;
using System.Collections.Generic;
using System.Net.Sockets;
using System.Text;

namespace LightSocket.Packet
{
    public interface IPacketizer : IDisposable
    {
        IEnumerable<IPacket> ReadPackets(SocketAsyncEventArgs e);

        bool SetBuffer(SocketAsyncEventArgs e, IPacket packet);
    }
}
