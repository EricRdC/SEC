import io from 'socket.io-client';

const socket = io.connect('http://192.168.0.143:4000')

export default socket;
