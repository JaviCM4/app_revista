<script setup lang="ts">
import { ref, reactive } from 'vue'
import { authService } from '@/services/auth/auth.service'
import { useAuthStore } from '@/stores/auth'
import type { CredentialRequest } from '@/types/auth/CredentialRequest'
import type { TokenLoginRequest } from '@/types/auth/TokenLoginRequest'
import type { CredentialResponse } from '@/types/auth/CredentialResponse'

const authStore = useAuthStore()

// ── Formulario principal ──────────────────────────────────────────────────────
const form = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)
const loading = ref(false)
const showPass = ref(false)

const credentials = reactive<CredentialRequest>({
  username: '',
  password: '',
})

// ── Diálogo OTP ───────────────────────────────────────────────────────────────
const otpDialog = ref(false)
const otpToken = ref('')
const otpLoading = ref(false)

// ── Snackbar ──────────────────────────────────────────────────────────────────
const snackbar = reactive({
  show: false,
  message: '',
  color: 'success' as string,
  icon: 'mdi-check-circle-outline',
})

const notifyMap = {
  success: { color: 'success', icon: 'mdi-check-circle-outline' },
  error: { color: 'error', icon: 'mdi-alert-circle-outline' },
  warning: { color: 'warning', icon: 'mdi-alert-outline' },
  info: { color: 'info', icon: 'mdi-information-outline' },
} as const

function notify(message: string, type: keyof typeof notifyMap = 'success') {
  Object.assign(snackbar, { show: true, message, ...notifyMap[type] })
}

// ── Validación ────────────────────────────────────────────────────────────────
const required = (v: string) => !!v?.trim() || 'Campo obligatorio'

// ── Sesión ────────────────────────────────────────────────────────────────────
function persistSession(res: CredentialResponse) {
  authStore.setSession(res)
  notify(`Bienvenido, ${res.username}`, 'success')
  // router.push({ name: 'home' })
}

// ── Paso 1: Login ─────────────────────────────────────────────────────────────
async function handleLogin() {
  const { valid } = await form.value!.validate()
  if (!valid) return

  loading.value = true
  try {
    const res = await authService.login({ ...credentials })

    if (!res.token) {
      // El servidor requiere verificación adicional
      otpToken.value = ''
      otpDialog.value = true
      notify('Ingresa el token de verificación para continuar.', 'info')
    } else {
      persistSession(res)
    }
  } catch (e: unknown) {
    notify(errorMessage(e), 'error')
  } finally {
    loading.value = false
  }
}

// ── Paso 2: Verificar token ───────────────────────────────────────────────────
async function handleVerify() {
  if (!otpToken.value.trim()) {
    notify('Ingresa el token.', 'warning')
    return
  }

  otpLoading.value = true
  try {
    const payload: TokenLoginRequest = { tokenVerification: otpToken.value.trim() }
    const res = await authService.verifyLoginToken(payload)

    if (!res.token) throw new Error('El servidor no devolvió un token válido.')

    otpDialog.value = false
    persistSession(res)
  } catch (e: unknown) {
    notify(errorMessage(e), 'error')
  } finally {
    otpLoading.value = false
  }
}

function closeOtp() {
  otpDialog.value = false
  otpToken.value = ''
}

function errorMessage(e: unknown): string {
  if (typeof e === 'string') return e
  if (e && typeof e === 'object' && 'message' in e) return (e as { message: string }).message
  return 'Ocurrió un error. Inténtalo de nuevo.'
}
</script>

<template>
  <v-app>

    <!-- ── Snackbar ── -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3500" location="top" rounded="pill">
      <v-icon :icon="snackbar.icon" class="mr-2" />
      {{ snackbar.message }}
      <template #actions>
        <v-btn icon="mdi-close" variant="text" @click="snackbar.show = false" />
      </template>
    </v-snackbar>

    <!-- ── Diálogo: verificar token ── -->
    <v-dialog v-model="otpDialog" max-width="420" persistent>
      <v-card rounded="xl">
        <v-card-title class="pt-6 px-6 d-flex align-center gap-2">
          <v-icon icon="mdi-shield-key-outline" color="warning" />
          <span class="text-h6 font-weight-bold">Verificación requerida</span>
        </v-card-title>

        <v-card-text class="px-6 pb-2">
          <p class="text-body-2 text-medium-emphasis mb-5">
            Tu cuenta requiere un token de verificación adicional.
            Ingrésalo a continuación para completar el acceso.
          </p>
          <v-text-field v-model="otpToken" label="Token de verificación" prepend-inner-icon="mdi-key-outline"
            variant="outlined" rounded="lg" autofocus hide-details="auto" :rules="[required]"
            @keyup.enter="handleVerify" />
        </v-card-text>

        <v-card-actions class="px-6 pb-6 pt-3">
          <v-btn variant="text" :disabled="otpLoading" @click="closeOtp">
            Cancelar
          </v-btn>
          <v-spacer />
          <v-btn color="primary" variant="flat" rounded="lg" size="large" :loading="otpLoading" @click="handleVerify">
            <v-icon icon="mdi-check" class="mr-1" /> Verificar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ── Pantalla de login ── -->
    <v-container class="fill-height" fluid>
      <v-row justify="center" align="center" class="fill-height">
        <v-col cols="12" sm="8" md="5" lg="4">

          <!-- Card -->
          <v-card class="login-card" rounded="xl" elevation="0">
            <v-card-text class="pa-8">

              <p class="text-h6 font-weight-bold mb-1">Iniciar sesión</p>
              <p class="text-body-2 text-medium-emphasis mb-6">Accede a tus suscripciones</p>

              <v-form ref="form" @submit.prevent="handleLogin">

                <v-text-field v-model="credentials.username" label="Usuario" prepend-inner-icon="mdi-account-outline"
                  variant="outlined" rounded="lg" :rules="[required]" class="mb-3" hide-details="auto" />

                <v-text-field v-model="credentials.password" label="Contraseña" prepend-inner-icon="mdi-lock-outline"
                  :append-inner-icon="showPass ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                  :type="showPass ? 'text' : 'password'" variant="outlined" rounded="lg" :rules="[required]"
                  hide-details="auto" @click:append-inner="showPass = !showPass" />

                <router-link to="/recover/password" class="text-right mt-2 mb-5 d-block">
                  <a class=" forgot-link text-caption">¿Olvidaste tu contraseña?</a>
                </router-link>

                <router-link to="/first/login" class="text-right mt-2 mb-5 d-block">
                  <a class="first-login-link text-caption">Primer inicio de sesion</a>
                </router-link>

                <hr style="border: 1px solid #ccc; margin: 20px 0;">

                <v-btn type="submit" :loading="loading" block size="large" rounded="lg" elevation="0" color="primary">
                  Entrar
                </v-btn>

              </v-form>
            </v-card-text>

            <v-divider />

            <v-card-text class="text-center py-4">
              <span class="text-caption text-medium-emphasis">¿No tienes cuenta?</span>
              <router-link to="/create/suscriptor" class="register-link text-caption font-weight-bold ml-1">
                Suscríbete
              </router-link>
            </v-card-text>
          </v-card>

        </v-col>
      </v-row>
    </v-container>
  </v-app>
</template>

<style scoped>
/* ── Fondo app ── */
.v-application {
  background: #1a1008 !important;
}

/* ── Logo ── */
.logo-icon {
  color: #e8c97a;
}

.logo-title {
  color: #e8c97a;
  letter-spacing: 2px;
}

/* ── Card login ── */
.login-card {
  background-color: #2c1f0f !important;
}

/* ── Enlace olvidé contraseña ── */
.forgot-link {
  color: #b5451b;
  text-decoration: none;
}

.forgot-link:hover {
  text-decoration: underline;
}

.first-login-link {
  color: #e8c97a;
  text-decoration: none;
}

.first-login-link:hover {
  text-decoration: underline;
}

/* ── Enlace registro ── */
.register-link {
  color: #e8c97a;
  text-decoration: none;
}

.register-link:hover {
  text-decoration: underline;
}
</style>