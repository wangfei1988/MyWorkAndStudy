using System;
using System.Collections.Generic;
using System.Net.Sockets;
using System.Text;

namespace LightSocket.Packet
{
    public class LinePacketizer : IPacketizer
    {
        public void Dispose()
        {
            throw new NotImplementedException();
        }

        public IEnumerable<IPacket> ReadPackets(SocketAsyncEventArgs e)
        {
            throw new NotImplementedException();
        }

        public bool SetBuffer(SocketAsyncEventArgs e, IPacket packet)
        {
            throw new NotImplementedException();
        }
    }
}
