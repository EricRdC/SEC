import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import socket from './services/socketio';
import { Gyroscope, Accelerometer } from 'expo-sensors';
import * as Location from 'expo-location';

let fall = false; //stores if a fall has occurred
let trigger1 = false; //stores if first trigger (lower threshold) has occurred
let trigger2 = false; //stores if second trigger (upper threshold) has occurred
let trigger3 = false; //stores if third trigger (orientation change) has occurred
let trigger1count = 0; //stores the counts past since trigger 1 was set true
let trigger2count = 0; //stores the counts past since trigger 2 was set true
let trigger3count = 0; //stores the counts past since trigger 3 was set true
let angleChange = 0;
let lastTime = 0;
let timerDelay = 0;
let timer = 0;


export default function App() {
  const [message, setMessage] = useState('');
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);


  useEffect(() => {
    socket.on('teste', (msg) => {
      console.log(msg);
      setMessage(msg);
    });
  }, [])

  const [dataAccelerometer, setDataAccelerometer] = useState(''); ({
    x: 0,
    y: 0,
    z: 0,
  });

  const [dataGyroscope, setDataGyroscope] = useState(''); ({
    x: 0,
    y: 0,
    z: 0,
  });

  async function getGps() {
    await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
    }).then(location => {
      setLocation(location);
    }).catch(error => {
      setErrorMsg(error.message);
    });
  }


  function start() {
    Accelerometer.addListener(accelerometerData => {
      setDataAccelerometer(accelerometerData);
    })

    Gyroscope.addListener(gyroscopeData => {
      setDataGyroscope(gyroscopeData);
    })
  };



  // funcao para ativar o sensor Accelerometer e Gyroscope
  useEffect(() => {
    start();
    Accelerometer.setUpdateInterval(500);
    Gyroscope.setUpdateInterval(500);
  }, []);

  // funcao para enviar os dados do sensor Accelerometer e Gyroscope para o servidor
  useEffect(async () => {
    let raw_amplitude = Math.pow(Math.pow(dataAccelerometer.x, 2) + Math.pow(dataAccelerometer.y, 2) + Math.pow(dataAccelerometer.z, 2), 0.5);
    // console.log(raw_amplitude);
    
    if (raw_amplitude <= 3 && trigger2 == false) {
      trigger1 = true;
      console.log("Trigger 1 ativado");
    }
    if (trigger1 == true) {
      trigger1count++;
      if (raw_amplitude >= 6) { //if AM breaks upper threshold (3g)
        trigger2 = true;
        console.log("TRIGGER 2 ativado");
        trigger1 = false; trigger1count = 0;
      }
    }
    if (trigger2 == true) {
      trigger2count++;
      angleChange = Math.pow(Math.pow(dataGyroscope.x, 2) + Math.pow(dataGyroscope.y, 2) + Math.pow(dataGyroscope.z, 2), 0.5);
      console.log(angleChange);
      if (angleChange >= 2 && angleChange <= 400) { //if orientation changes by between 80-100 degrees
        trigger3 = true; trigger2 = false; trigger2count = 0;
        console.log(angleChange);
        console.log("TRIGGER 3 ACTIVATED");
      }
    }
    if (trigger3 == true) {
      trigger3count++;
      if (trigger3count >= 10) {
        angleChange = Math.pow(Math.pow(dataGyroscope.x, 2) + Math.pow(dataGyroscope.y, 2) + Math.pow(dataGyroscope.z, 2), 0.5);
        console.log(angleChange);
        if ((angleChange >= 0) && (angleChange <= 10)) { //if orientation changes remains between 0-10 degrees
          fall = true; trigger3 = false; trigger3count = 0;
          console.log(angleChange);
        }
        else { //user regained normal orientation
          trigger3 = false; trigger3count = 0;
          console.log("TRIGGER 3 DEACTIVATED");
        }
      }
    }
    if (fall == true) { //in event of a fall detection
      console.log("FALL DETECTED");
      await getGps();
      socket.emit('sensores',
        {
          accelerometer: dataAccelerometer,
          gyroscope: dataGyroscope,
          location: {
            latitude: location?.coords?.latitude,
            longitude: location?.coords?.longitude,
          }
        }
      );
      fall = false;
    }
    if (trigger2count >= 6) { //allow 0.5s for orientation change
      trigger2 = false; trigger2count = 0;
      console.log("TRIGGER 2 DECACTIVATED");
    }
    if (trigger1count >= 6) { //allow 0.5s for AM to break upper threshold
      trigger1 = false; trigger1count = 0;
      console.log("TRIGGER 1 DECACTIVATED");
    }

  }, [dataAccelerometer, dataGyroscope])

  // funcao para obter a localizacao do usuario e pedir permissao para obter a localizacao
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      getGps();
    })();
  }, []);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => getGps()}>
        <Text>Obter localizacao</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
