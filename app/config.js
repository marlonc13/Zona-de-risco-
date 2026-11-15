import { View, TouchableOpacity, Alert } from 'react-native';
import { Text, TextInput } from '../components/texto';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { Entypo, FontAwesome5, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

import { auth } from '../services/firebaseConfig';
import { Colors } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useFonte } from '../contexts/FonteContext';
import ScreenWrapper from '../components/screen-wrapper';

import styles from '../styles/config.styles';

const OPCOES_TEMA = [
  { valor: 'light', rotulo: 'Claro', icone: 'sunny-outline' },
  { valor: 'dark', rotulo: 'Escuro', icone: 'moon-outline' },
  { valor: 'system', rotulo: 'Sistema', icone: 'phone-portrait-outline' },
];

export default function Config() {
  const { themeMode, activeTheme, toggleTheme } = useTheme();
  const temaAtual = activeTheme || 'light';
  const cores = Colors[temaAtual] || Colors.light;
  const escuro = temaAtual === 'dark';

  const { letraGrande, alternarLetraGrande } = useFonte();
  const [excluindoConta, setExcluindoConta] = useState(false);

  // senha
  const [senhaAberta, setSenhaAberta] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mostrarSenhas, setMostrarSenhas] = useState(false);
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  // só quem entrou com email/senha pode trocar senha (contas Google não têm senha)
  const usaSenha = auth.currentUser?.providerData?.some(p => p.providerId === 'password');

  const alterarSenha = async () => {
    const user = auth.currentUser;
    if (!user) return;
    if (!senhaAtual || !novaSenha || !confirmarSenha) return Alert.alert('Campos obrigatórios', 'Preencha a senha atual, a nova senha e a confirmação.');
    if (novaSenha.length < 6) return Alert.alert('Senha fraca', 'A nova senha precisa ter pelo menos 6 caracteres.');
    if (novaSenha !== confirmarSenha) return Alert.alert('Senhas diferentes', 'A confirmação precisa ser igual à nova senha.');

    try {
      setSalvandoSenha(true);
      const credencial = EmailAuthProvider.credential(user.email, senhaAtual);
      await reauthenticateWithCredential(user, credencial);
      await updatePassword(user, novaSenha);
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
      setMostrarSenhas(false);
      setSenhaAberta(false);
      Alert.alert('Senha alterada', 'Sua senha foi atualizada com sucesso.');
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      let mensagem = `Não foi possível alterar a senha. Código: ${error.code || 'desconhecido'}.`;
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') mensagem = 'A senha atual está incorreta.';
      if (error.code === 'auth/weak-password') mensagem = 'A nova senha precisa ter pelo menos 6 caracteres.';
      Alert.alert('Erro', mensagem);
    } finally {
      setSalvandoSenha(false);
    }
  };

  const confirmarExclusaoConta = () => {
    Alert.alert(
      'Excluir conta',
      'Tem certeza que deseja excluir sua conta? Essa ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: excluirConta },
      ]
    );
  };

  const excluirConta = async () => {
    try {
      setExcluindoConta(true);

      const usuarioAtual = auth.currentUser;

      if (!usuarioAtual) {
        Alert.alert('Erro', 'Nenhum usuário logado foi encontrado.');
        return;
      }

      await deleteUser(usuarioAtual);
      await AsyncStorage.clear();

      Alert.alert('Conta excluída', 'Sua conta foi excluída com sucesso.');
      router.replace('/');
    } catch (error) {
      console.log('Erro ao excluir conta:', error);

      if (error.code === 'auth/requires-recent-login') {
        Alert.alert(
          'Login recente necessário',
          'Por segurança, faça login novamente e tente excluir a conta logo em seguida.'
        );
      } else {
        Alert.alert('Erro', 'Não foi possível excluir sua conta agora. Tente novamente.');
      }
    } finally {
      setExcluindoConta(false);
    }
  };

  const inputStyle = {
    borderWidth: 1,
    borderColor: '#9aa0a6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
    color: cores.text,
    fontSize: 16,
  };

  return (
    <ScreenWrapper
      scrollable
      includeTop={false} // o header da Stack já cuida do topo
      backgroundColor={cores.background}
      style={styles.container}
    >
      <View style={styles.headerIconWrap}>
        <Ionicons name="settings-sharp" size={42} color="grey" />
      </View>
      <Text style={[styles.title, { color: cores.text }]}>Configurações</Text>
      <Text style={[styles.subtitle, { color: cores.text }]}>Gerencie sua conta e a aparência do app</Text>

      <View style={styles.optionsContainer}>
        {auth.currentUser && (
          <>
            <Text style={[styles.sectionTitle, { color: cores.text }]}>Conta</Text>

            {/* Residência */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.optionCard, styles.optionRow, { backgroundColor: cores.card }]}
              onPress={() => router.push('/endereco')}
            >
              <View style={[styles.iconBadge, { backgroundColor: '#1a73e8' }]}>
                <FontAwesome5 name="house-user" size={20} color="white" />
              </View>
              <View style={styles.optionTextArea}>
                <Text style={[styles.label, { color: cores.text }]}>Minha residência</Text>
                <Text style={[styles.description, { color: cores.text }]}>Adicionar ou alterar o endereço cadastrado.</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="grey" />
            </TouchableOpacity>

            {/* Senha */}
            {usaSenha && (
              <View style={[styles.optionCard, { backgroundColor: cores.card }]}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.optionRow}
                  onPress={() => setSenhaAberta(aberta => !aberta)}
                >
                  <View style={[styles.iconBadge, { backgroundColor: '#8e24aa' }]}>
                    <MaterialCommunityIcons name="lock-reset" size={24} color="white" />
                  </View>
                  <View style={styles.optionTextArea}>
                    <Text style={[styles.label, { color: cores.text }]}>Alterar senha</Text>
                    <Text style={[styles.description, { color: cores.text }]}>Troque a senha de acesso da sua conta.</Text>
                  </View>
                  <Ionicons name={senhaAberta ? 'chevron-up' : 'chevron-down'} size={22} color="grey" />
                </TouchableOpacity>

                {senhaAberta && (
                  <View style={styles.passwordArea}>
                    <View style={styles.inputRow}>
                      <TextInput
                        style={[styles.input, { color: cores.text }]}
                        placeholder="Senha atual"
                        placeholderTextColor="#9aa0a6"
                        secureTextEntry={!mostrarSenhas}
                        value={senhaAtual}
                        onChangeText={setSenhaAtual}
                      />
                      <TouchableOpacity onPress={() => setMostrarSenhas(atual => !atual)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name={mostrarSenhas ? 'eye-off' : 'eye'} size={20} color="grey" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.inputRow}>
                      <TextInput
                        style={[styles.input, { color: cores.text }]}
                        placeholder="Nova senha"
                        placeholderTextColor="#9aa0a6"
                        secureTextEntry={!mostrarSenhas}
                        value={novaSenha}
                        onChangeText={setNovaSenha}
                      />
                    </View>

                    <View style={styles.inputRow}>
                      <TextInput
                        style={[styles.input, { color: cores.text }]}
                        placeholder="Confirmar nova senha"
                        placeholderTextColor="#9aa0a6"
                        secureTextEntry={!mostrarSenhas}
                        value={confirmarSenha}
                        onChangeText={setConfirmarSenha}
                      />
                    </View>

                    <TouchableOpacity
                      style={[styles.saveButton, salvandoSenha && styles.disabledButton]}
                      onPress={alterarSenha}
                      disabled={salvandoSenha}
                    >
                      <Text style={styles.saveButtonText}>
                        {salvandoSenha ? 'Alterando senha...' : 'Salvar nova senha'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </>
        )}

        <Text style={[styles.sectionTitle, { color: cores.text }]}>Aparência</Text>

        {/* Tema */}
        <View style={[styles.optionCard, { backgroundColor: cores.card }]}>
          <View style={styles.optionRow}>
            <View style={[styles.iconBadge, { backgroundColor: '#3949ab' }]}>
              <Ionicons name={escuro ? 'moon' : 'sunny'} size={22} color="white" />
            </View>
            <View style={styles.optionTextArea}>
              <Text style={[styles.label, { color: cores.text }]}>Tema</Text>
              <Text style={[styles.description, { color: cores.text }]}>Escolha entre o modo claro e o modo escuro.</Text>
            </View>
          </View>

          <View style={styles.themeOptions}>
            {OPCOES_TEMA.map(({ valor, rotulo, icone }) => {
              const ativo = (themeMode || 'system') === valor;
              return (
                <TouchableOpacity
                  key={valor}
                  activeOpacity={0.8}
                  style={[styles.themeOption, ativo && styles.themeOptionActive]}
                  onPress={() => toggleTheme(valor)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: ativo }}
                >
                  <Ionicons name={icone} size={18} color={ativo ? '#fff' : cores.text} />
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                    style={[styles.themeOptionText, { color: ativo ? '#fff' : cores.text }]}
                  >
                    {rotulo}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: cores.text }]}>Acessibilidade</Text>

        {/* Letras grandes */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.optionCard, styles.optionRow, { backgroundColor: cores.card }]}
          onPress={alternarLetraGrande}
          accessibilityRole="switch"
          accessibilityState={{ checked: letraGrande }}
        >
          <View style={[styles.iconBadge, { backgroundColor: '#fb8c00' }]}>
            <MaterialCommunityIcons name="format-letter-case" size={28} color="white" />
          </View>
          <View style={styles.optionTextArea}>
            <Text style={[styles.label, { color: cores.text }]}>Letras grandes</Text>
            <Text style={[styles.description, { color: cores.text }]}>Aumenta em 30% o tamanho do texto em todas as telas.</Text>
          </View>
          <Ionicons
            name={letraGrande ? 'checkmark-circle' : 'ellipse-outline'}
            size={26}
            color={letraGrande ? '#43a047' : 'grey'}
          />
        </TouchableOpacity>

        {/* Excluir conta */}
        {auth.currentUser && (
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.deleteButton, excluindoConta && styles.disabledButton]}
            onPress={confirmarExclusaoConta}
            disabled={excluindoConta}
          >
            <Ionicons name="trash-outline" size={20} color="#e53935" />
            <Text style={styles.deleteButtonText}>
              {excluindoConta ? 'Excluindo...' : 'Excluir conta'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScreenWrapper>
  );
}