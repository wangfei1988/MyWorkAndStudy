using System;
using System.Collections.Generic;
using System.Text;

namespace LightSocket.Common
{
    public class CircularBuffer
    {
        object locker = new object();

        int head;
        int tail;
        int length;
        int remainingLength;
        byte[] buffer;


        public CircularBuffer()
        {
            buffer = new byte[2048];
            Clear();
        }

        public int Length
        {
            get { return length; }
        }

        public byte this[int index]
        {
            get
            {
                if (head < tail)
                {
                    int rightLength = this.buffer.Length - tail;

                    if (rightLength >= index)
                    {
                        index = head + index;
                    }
                    else
                    {
                        index = index - rightLength;
                    }

                }
                else
                {
                    index = (head + index) % this.buffer.Length;
                }

                return buffer[index];
            }
        }

        public void Clear()
        {
            lock (locker)
            {
                head = 0;
                tail = 0;
                length = 0;
                remainingLength = buffer.Length;
            }
        }

        void Resize(int newLength)
        {
            byte[] newBuffer = new byte[newLength];

            if (length > 0)
            {
                if (head < tail)
                {
                    Buffer.BlockCopy(buffer, head, newBuffer, 0, length);
                }
                else
                {
                    Buffer.BlockCopy(buffer, head, newBuffer, 0, buffer.Length - head);
                    Buffer.BlockCopy(buffer, 0, newBuffer, buffer.Length - head, tail);
                }
            }

            remainingLength += newLength - buffer.Length;
            head = 0;
            tail = length;
            buffer = newBuffer;
        }

        public void Write(byte[] buffer, int offset, int length)
        {
            if (length == 0)
                return;

            lock (locker)
            {
                /* Resize buffer when we are not able to write required length */
                if (length > remainingLength)
                    Resize((this.buffer.Length + length + 2047) & ~2047);

                /* Are our buffer data overflowing? */
                if (head < tail)
                {
                    int rightLength = this.buffer.Length - tail;

                    /* Can we write data at the end of the tail? */
                    if (rightLength >= length)
                    {
                        Buffer.BlockCopy(buffer, offset, this.buffer, tail, length);
                    }
                    else
                    {
                        /* We need to split writing data */
                        Buffer.BlockCopy(buffer, offset, this.buffer, tail, rightLength);
                        Buffer.BlockCopy(buffer, offset + rightLength, this.buffer, 0, length - rightLength);
                    }
                }
                else
                {
                    Buffer.BlockCopy(buffer, offset, this.buffer, tail, length);
                }

                tail = (tail + length) % this.buffer.Length;
                this.length += length;
                remainingLength -= length;

                if (remainingLength != (this.buffer.Length - this.length))
                {
                    throw new InvalidOperationException();
                }
            }
        }

        public int Read(byte[] buffer, int offset, int length)
        {
            lock (locker)
            {
                if (length == 0)
                    return 0;

                if (length > this.length)
                    length = this.length;

                /* Are our buffer data splitted? */
                if (head > tail)
                {
                    int rightLength = this.buffer.Length - head;

                    /* Can we write data at the end of the tail? */
                    if (rightLength >= length)
                    {
                        Buffer.BlockCopy(this.buffer, head, buffer, offset, length);
                    }
                    else
                    {
                        Buffer.BlockCopy(this.buffer, head, buffer, offset, rightLength);
                        Buffer.BlockCopy(this.buffer, 0, buffer, offset + rightLength, length - rightLength);
                    }
                }
                else
                {
                    Buffer.BlockCopy(this.buffer, head, buffer, offset, length);
                }


                head = (head + length) % this.buffer.Length;
                this.length -= length;

                if (this.length == 0)
                {
                    Clear();
                }
                else
                {
                    remainingLength += length;
                }

                return length;
            }
        }
    }
}
