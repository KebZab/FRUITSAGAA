// screens/LoginScreen.js
import React, { useState, useContext, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, Alert, Platform,
  StyleSheet, Pressable, ActivityIndicator, Modal,
  Animated, Easing, Dimensions,
} from 'react-native';
import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import LoginLayout from '../components/layouts/LoginLayout';
import ModelViewer from '../components/ModelViewer';
import { auth, db } from '../firebaseConfig';
import {
  GoogleAuthProvider, signInWithPopup, signInWithCredential,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { AuthContext } from '../contexts/AuthContext';

const GOOGLE_WEB_CLIENT_ID = '132571887694-v85c2lialak4j7vq10ur86se9imj4u1k.apps.googleusercontent.com';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  // ── existing state ──────────────────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createUserEmail, setCreateUserEmail] = useState('');
  const [createUserPass, setCreateUserPass] = useState('');
  const [createUserConfirmPass, setCreateUserConfirmPass] = useState('');
  const [createUserFirstname, setCreateUserFirstname] = useState('');
  const [createUserLastname, setCreateUserLastname] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const isWeb = Platform.OS === 'web';

  const introModelProps = useMemo(() => (
    isWeb
      ? { height: 230, scale: 5.4, cameraZ: 2.35, position: [0, -0.04, 0] }
      : { height: 180, scale: 4.6, cameraZ: 2.8, position: [0, -0.12, 0] }
  ), [isWeb]);

  const cardModelProps = useMemo(() => (
    isWeb
      ? { height: 200, scale: 8.6, cameraZ: 2.15, position: [0, -0.24, 0] }
      : { height: 150, scale: 6.5, cameraZ: 2.5, position: [0, -0.58, 0] }
  ), [isWeb]);

  // ── intro animation state ───────────────────────────────────────────────────
  const [introVisible, setIntroVisible] = useState(true);

  const brandAnim = useRef(new Animated.Value(0)).current;
  const introScaleAnim = useRef(new Animated.Value(1.8)).current;
  const introOpacityAnim = useRef(new Animated.Value(1)).current;
  const loginOpacityAnim = useRef(new Animated.Value(0)).current;

  const { signIn } = useContext(AuthContext);

  // ── intro sequence ──────────────────────────────────────────────────────────
  useEffect(() => {
    Animated.sequence([
      // 1. Brand text fades in
      Animated.timing(brandAnim, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),

      // 2. Pause
      Animated.delay(400),

      // 3. Smooth zoom-out + fade transition
      Animated.parallel([
        Animated.timing(introScaleAnim, {
          toValue: 0.25,
          duration: 850,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }),
        Animated.timing(introOpacityAnim, {
          toValue: 0,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(loginOpacityAnim, {
          toValue: 1,
          duration: 850,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => setIntroVisible(false));
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      GoogleSignin.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        offlineAccess: false,
        scopes: ['profile', 'email'],
      });
    }
  }, []);

  // ── helpers (unchanged) ─────────────────────────────────────────────────────
  const notify = (title, msg) => {
    if (Platform.OS === 'web') window.alert(`${title}: ${msg}`);
    else Alert.alert(title, msg);
  };

  const fetchUserData = async (uid) => {
    try {
      const userRef = doc(db, 'users_basic', uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        return { role: data.role || 'user', disabled: data.disabled || false };
      }
    } catch (e) {
      console.log('fetchUserData error:', e);
    }
    return { role: 'user', disabled: false };
  };

  const handleAuthSuccess = async (firebaseUser) => {
    const { role, disabled } = await fetchUserData(firebaseUser.uid);
    
    // Check if user document exists, if not create it
    try {
      const userRef = doc(db, 'users_basic', firebaseUser.uid);
      const snap = await getDoc(userRef);
      
      if (!snap.exists()) {
        // New user - create document
        const nameParts = (firebaseUser.displayName || firebaseUser.email.split('@')[0]).split(' ');
        const firstname = nameParts[0] || '';
        const lastname = nameParts.slice(1).join(' ') || '';
        
        await setDoc(userRef, {
          uid: firebaseUser.uid,
          email: firebaseUser.email.toLowerCase(),
          firstname,
          lastname,
          username: firebaseUser.email.split('@')[0],
          role: 'user',
          disabled: false,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.log('Error creating user document:', e);
    }
    
    if (disabled) {
      await signOut(auth).catch(() => {});
      notify('Account Disabled', 'Your account has been disabled. Please contact support.');
      return;
    }

    const userData = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
      role,
    };

    await signIn(userData);
  };

  const handleLogin = async () => {
    if (!email.trim() || !pass.trim()) {
      notify('Oops', 'Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      const { user: firebaseUser } = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        pass
      );

      await handleAuthSuccess(firebaseUser);
    } catch (err) {
      console.log('Login error:', err.message);
      notify('Authentication Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      if (Platform.OS === 'web') {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        await handleAuthSuccess(result.user);
        return;
      }

      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn({
        prompt: 'select_account',
      });

      if (isCancelledResponse(response)) return;
      if (!isSuccessResponse(response)) {
        throw new Error('Google sign-in did not return an account.');
      }

      const idToken = response.data.idToken;
      if (!idToken) {
        throw new Error('Google did not return an ID token.');
      }

      const credential = GoogleAuthProvider.credential(idToken);
      const { user: firebaseUser } = await signInWithCredential(auth, credential);
      await handleAuthSuccess(firebaseUser);
    } catch (error) {
      if (isErrorWithCode(error) && error.code === statusCodes.IN_PROGRESS) return;
      if (isErrorWithCode(error) && error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Google Sign-In Unavailable', 'Google Play Services is not available or needs an update.');
        return;
      }
      Alert.alert('Google Authentication failed', error.message);
    }
  };

  const handleCreateUser = async () => {
    if (
      !createUserFirstname.trim() ||
      !createUserLastname.trim() ||
      !createUserEmail.trim() ||
      !createUserPass.trim()
    ) {
      notify('Missing Fields', 'Please fill in all fields.');
      return;
    }

    if (createUserPass !== createUserConfirmPass) {
      notify('Password Mismatch', 'Passwords do not match.');
      return;
    }

    if (createUserPass.length < 6) {
      notify('Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    setCreatingUser(true);

    try {
      const { user: firebaseUser } =
        await createUserWithEmailAndPassword(
          auth,
          createUserEmail.trim(),
          createUserPass,
        );

      const displayName =
        `${createUserFirstname.trim()} ${createUserLastname.trim()}`;

      const userRef = doc(db, 'users_basic', firebaseUser.uid);

      await setDoc(userRef, {
        uid: firebaseUser.uid,
        email: createUserEmail.trim().toLowerCase(),
        firstname: createUserFirstname.trim(),
        lastname: createUserLastname.trim(),
        username: createUserEmail.trim().split('@')[0],
        role: 'user',
        disabled: false,
        createdAt: new Date().toISOString(),
      });

      const userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: displayName,
        role: 'user',
      };

      await signIn(userData);

      setShowCreateUser(false);
      setCreateUserEmail('');
      setCreateUserPass('');
      setCreateUserConfirmPass('');
      setCreateUserFirstname('');
      setCreateUserLastname('');
    } catch (err) {
      console.log('Create user error:', err.message);
      notify('Account Creation Failed', err.message);
    } finally {
      setCreatingUser(false);
    }
  };

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <LoginLayout>

      {/* ─── Create-Account Modal ─────────────────────────────── */}
      <Modal
        visible={showCreateUser}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateUser(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>

            <Pressable
              onPress={() => setShowCreateUser(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>

            <Text style={styles.modalTitle}>Create Account</Text>

            <TextInput
              placeholder="First Name"
              placeholderTextColor="#999"
              value={createUserFirstname}
              onChangeText={setCreateUserFirstname}
              style={styles.input}
            />

            <TextInput
              placeholder="Last Name"
              placeholderTextColor="#999"
              value={createUserLastname}
              onChangeText={setCreateUserLastname}
              style={styles.input}
            />

            <TextInput
              placeholder="Email"
              placeholderTextColor="#999"
              value={createUserEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              onChangeText={setCreateUserEmail}
              style={styles.input}
            />

            <TextInput
              placeholder="Password (min 6 characters)"
              placeholderTextColor="#999"
              value={createUserPass}
              onChangeText={setCreateUserPass}
              secureTextEntry
              style={styles.input}
            />

            <TextInput
              placeholder="Confirm Password"
              placeholderTextColor="#999"
              value={createUserConfirmPass}
              onChangeText={setCreateUserConfirmPass}
              secureTextEntry
              style={styles.input}
            />

            <Pressable
              style={[styles.loginBtn, creatingUser && { opacity: 0.7 }]}
              onPress={handleCreateUser}
              disabled={creatingUser}
            >
              {creatingUser
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.loginBtnText}>Create Account</Text>}
            </Pressable>

          </View>
        </View>
      </Modal>

      {/* ─── Intro Animation Overlay ───────────────────────────────────────── */}
      {introVisible && (
        <Animated.View
          style={[
            styles.introOverlay,
            { opacity: introOpacityAnim }
          ]}
        >

          <Animated.View
            style={[
              styles.introModelWrap,
              {
                transform: [
                  { scale: introScaleAnim },
                ],
              },
            ]}
          >
            <ModelViewer {...introModelProps} />
          </Animated.View>

          <Animated.View
            style={[
              styles.introBrandWrap,
              { opacity: brandAnim }
            ]}
          >
            <Text style={styles.introBrandTitle}>Fruit Saga</Text>
            <Text style={styles.introBrandSub}>
              Order fresh fruits, delivered fast
            </Text>
          </Animated.View>

        </Animated.View>
      )}

      {/* ─── Login Card ────────────────────────────── */}
      <Animated.View style={{ opacity: loginOpacityAnim }}>
        <View style={styles.card}>

          {/* 3-D apple sitting atop the card D */}
          <View style={styles.modelContainer}>
            <ModelViewer {...cardModelProps} />
          </View>

          <Text style={styles.title}>Fruit Saga</Text>
          <Text style={styles.subtitle}>
            Order fresh fruits, delivered fast
          </Text>

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
            placeholder="Password"
            placeholderTextColor="#999"
            value={pass}
            onChangeText={setPass}
            secureTextEntry
            style={styles.input}
          />

          <Pressable
            onPress={() => setShowCreateUser(true)}
            style={styles.registerLink}
          >
            <Text style={styles.registerText}>
              New here?{' '}
              <Text style={styles.registerBold}>
                Create an account
              </Text>
            </Text>
          </Pressable>

          <Pressable
            style={[styles.loginBtn, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.loginBtnText}>Sign In</Text>}
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            style={styles.googleBtn}
            onPress={handleGoogleLogin}
            disabled={loading}
          >
            <Text style={styles.googleBtnText}>
              🌐 Sign in with Google
            </Text>
          </Pressable>

  

        </View>
      </Animated.View>

    </LoginLayout>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  /* ── Intro overlay ─────────────────────────────────────────────────────── */
  introOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },

  introModelWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  introBrandWrap: {
    alignItems: 'center',
    marginTop: 28,
  },

  introBrandTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#dd2a7b',
    letterSpacing: -0.5,
  },

  introBrandSub: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 6,
  },

  /* ── Modal ─────────────────────────────────────────────────────────────── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 400,
    elevation: 10,
    shadowColor: '#dd2a7b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },

  closeButton: {
    alignSelf: 'flex-end',
    marginBottom: 15,
  },

  closeButtonText: {
    fontSize: 24,
    color: '#999',
    fontWeight: 'bold',
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },

  /* ── Login card ────────────────────────────────────────────────────────── */
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

  modelContainer: {
    marginTop: 4,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    color: '#dd2a7b',
    letterSpacing: -0.5,
  },

  subtitle: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
    marginTop: 4,
  },

  input: {
    borderWidth: 1.5,
    borderColor: '#f0f0f0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    backgroundColor: '#fafafa',
    color: '#000',
    fontSize: 15,
  },

  registerLink: {
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 8,
  },

  registerText: {
    fontSize: 14,
    color: '#888',
  },

  registerBold: {
    color: '#0095F6',
    fontWeight: '700',
  },

  loginBtn: {
    backgroundColor: '#dd2a7b',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
    elevation: 3,
  },

  loginBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  googleBtn: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: '#e8e8e8',
  },

  googleBtnText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 15,
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#f0f0f0',
  },

  dividerText: {
    marginHorizontal: 10,
    color: '#bbb',
    fontSize: 13,
  },

  testText: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 11,
    color: '#bbb',
    lineHeight: 18,
  },
});
