using System;
using System.Collections.Generic;
using System.Net;
using System.Linq;
using System.Text;
using System.Net.Sockets;

namespace LightSocket.Extensions
{
    public static class IPAddressUtils
    {
        public static IPAddress GetIpAddress(string ipOrHost, AddressFamily addressFamily = AddressFamily.InterNetwork)
        {
            if (IPAddress.TryParse(ipOrHost, out IPAddress address))
                return address;

            return Dns.GetHostAddressesAsync(ipOrHost).Result.Where(x => x.AddressFamily == AddressFamily.InterNetwork).FirstOrDefault();
        }

    }
}
