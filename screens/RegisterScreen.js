// screens/RegisterScreen.js
import React, { useState, useContext } from 'react';
import {
  View, Text, TextInput, Alert, Platform,
  StyleSheet, Pressable, ActivityIndicator, ScrollView,
} from 'react-native';
import { auth, db } from '../firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import { AuthContext } from '../contexts/AuthContext';
import LoginLayout from '../components/layouts/LoginLayout';

export default function RegisterScreen({ navigation }) {
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn } = useContext(AuthContext);

  const notify = (title, msg) => {
    if (Platform.OS === 'web') window.alert(`${title}: ${msg}`);
    else Alert.alert(title, msg);
  };

  const handleRegister = async () => {
    // Validation
    if (!firstname.trim() || !lastname.trim() || !email.trim() || !pass.trim()) {
      notify('Missing Fields', 'Please fill in all fields.');
      return;
    }
    if (pass !== confirmPass) {
      notify('Password Mismatch', 'Passwords do not match.');
      return;
    }
    if (pass.length < 6) {
      notify('Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      // 1. Create Firebase Auth user
      const { user: firebaseUser } = await auth.createUserWithEmailAndPassword(
        email.trim(),
        pass,
      );

      // 2. Create Firestore profile document
      const displayName = `${firstname.trim()} ${lastname.trim()}`;
      const userRef = doc(db, 'users_basic', firebaseUser.uid);
      await setDoc(userRef, {
        uid: firebaseUser.uid,
        email: email.trim().toLowerCase(),
        firstname: firstname.trim(),
        lastname: lastname.trim(),
        username: email.trim().split('@')[0],
        role: 'user',
        disabled: false,
        createdAt: new Date().toISOString(),
      });

      // 3. Sign in to context
      const userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: displayName,
        role: 'user',
      };
      await signIn(userData);

      navigation.replace('Home');
    } catch (err) {
      console.log('Register error:', err.message);
      notify('Registration Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginLayout>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.logoEmoji}>🍍</Text>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join FruitFresh today</Text>

          <View style={styles.row}>
            <TextInput
              placeholder="First Name"
              placeholderTextColor="#999"
              value={firstname}
              onChangeText={setFirstname}
              style={[styles.input, styles.halfInput]}
            />
            <TextInput
              placeholder="Last Name"
              placeholderTextColor="#999"
              value={lastname}
              onChangeText={setLastname}
              style={[styles.input, styles.halfInput]}
            />
          </View>

          <TextInput
            placeholder="Email"
            placeholderTextColor="#999"
            value={email}
            keyboardType="email-address"
            autoCapitalize="none"
            onChangeText={setEmail}
            style={styles.input}
          />

          <TextInput
            placeholder="Password (min. 6 chars)"
            placeholderTextColor="#999"
            value={pass}
            onChangeText={setPass}
            secureTextEntry
            style={styles.input}
          />

          <TextInput
            placeholder="Confirm Password"
            placeholderTextColor="#999"
            value={confirmPass}
            onChangeText={setConfirmPass}
            secureTextEntry
            style={styles.input}
          />

          <Pressable
            style={[styles.registerBtn, loading && { opacity: 0.7 }]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.registerBtnText}>Create Account</Text>
            }
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('Login')}
            style={styles.loginLink}
          >
            <Text style={styles.loginLinkText}>
              Already have an account?{' '}
              <Text style={styles.loginBold}>Sign In</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </LoginLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    margin: 15,
    padding: 28,
    borderRadius: 24,
    elevation: 10,
    shadowColor: '#dd2a7b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  logoEmoji: {
    fontSize: 44,
    textAlign: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    color: '#dd2a7b',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginBottom: 22,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#f0f0f0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    backgroundColor: '#fafafa',
    fontSize: 15,
  },
  halfInput: {
    flex: 1,
  },
  registerBtn: {
    backgroundColor: '#dd2a7b',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
    elevation: 3,
  },
  registerBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 4,
  },
  loginLinkText: {
    fontSize: 14,
    color: '#888',
  },
  loginBold: {
    color: '#0095F6',
    fontWeight: '700',
  },
});