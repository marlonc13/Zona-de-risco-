import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef } from 'react';
import { View, Button, Text } from 'react-native';

export default function Explore() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  if (!permission) {
    return <Text>Carregando...</Text>;
  }

  if (!permission.granted) {
    return (
      <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
        <Text>Permissão necessária</Text>
        <Button title="Permitir câmera" onPress={requestPermission} />
      </View>
    );
  }

  const tirarFoto = async () => {
    if (cameraRef.current) {
      const foto = await cameraRef.current.takePictureAsync();
      alert("Foto tirada!");
      console.log(foto);
    }
  };

  return (
    <View style={{flex:1}}>
      <CameraView style={{flex:1}} ref={cameraRef} />
      <Button title="Tirar Foto" onPress={tirarFoto} />
    </View>
  );
}