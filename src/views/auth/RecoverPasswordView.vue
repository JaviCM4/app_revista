<script setup lang="ts">
import { ref, reactive } from 'vue'
import { authService } from '@/services/auth/auth.service'
import type { EmailRequest } from '@/types/auth/EmailRequest'
import type { RecoverPasswordRequest } from '@/types/auth/RecoverPasswordRequest'

// import { useRouter } from 'vue-router'
// const router = useRouter()

// ── Estado ────────────────────────────────────────────────────────────────────
const form = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)
const formDialog = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)
const loading = ref(false)
const loadingDialog = ref(false)
const showPass = ref(false)
const showConfirm = ref(false)
const dialog = ref(false)

const emailData = reactive<EmailRequest>({ email: '' })

const recoveryData = reactive<RecoverPasswordRequest>({
  tokenRecover: '',
  newPassword: '',
})

const confirmPassword = ref('')

// ── Snackbar ──────────────────────────────────────────────────────────────────
const snackbar = reactive({ show: false, message: '', color: 'success' as string, icon: '' })

const notifyMap = {
  success: { color: 'success', icon: 'mdi-check-circle-outline' },
  error: { color: 'error', icon: 'mdi-alert-circle-outline' },
  warning: { color: 'warning', icon: 'mdi-alert-outline' },
  info: { color: 'info', icon: 'mdi-information-outline' },
} as const

function notify(message: string, type: keyof typeof notifyMap = 'success') {
  Object.assign(snackbar, { show: true, message, ...notifyMap[type] })
}

// ── Validaciones ──────────────────────────────────────────────────────────────
const required = (v: string) => !!v?.trim() || 'Campo obligatorio'
const validEmail = (v: string) => /.+@.+\..+/.test(v) || 'Correo inválido'
const minLength = (n: number) => (v: string) => (v?.length ?? 0) >= n || `Mínimo ${n} caracteres`
const mustMatch = (v: string) => v === recoveryData.newPassword || 'Las contraseñas no coinciden'

// ── Paso 1: solicitar correo ──────────────────────────────────────────────────
async function handleRecoverPassword() {
  const { valid } = await form.value!.validate()
  if (!valid) return

  loading.value = true
  try {
    await authService.recoverPassword({ ...emailData })
    notify('Revisa tu correo, te enviamos un token de recuperación.', 'info')
    dialog.value = true
  } catch (e: unknown) {
    notify(errorMessage(e), 'error')
  } finally {
    loading.value = false
  }
}

// ── Paso 2: verificar token + nueva contraseña ────────────────────────────────
async function handleVerifyRecovery() {
  const { valid } = await formDialog.value!.validate()
  if (!valid) return

  loadingDialog.value = true
  try {
    await authService.verifyPasswordRecoveryToken({ ...recoveryData })
    notify('¡Contraseña actualizada correctamente!', 'success')
    dialog.value = false
    // router.push({ name: 'login' })
  } catch (e: unknown) {
    notify(errorMessage(e), 'error')
  } finally {
    loadingDialog.value = false
  }
}

function closeDialog() {
  dialog.value = false
  recoveryData.tokenRecover = ''
  recoveryData.newPassword = ''
  confirmPassword.value = ''
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
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="4500" location="top" rounded="pill">
      <v-icon :icon="snackbar.icon" class="mr-2" />
      {{ snackbar.message }}
      <template #actions>
        <v-btn icon="mdi-close" variant="text" @click="snackbar.show = false" />
      </template>
    </v-snackbar>

    <!-- ── Diálogo: token + nueva contraseña ── -->
    <v-dialog v-model="dialog" max-width="440" persistent>
      <v-card class="recovery-card" rounded="xl" elevation="0">

        <v-card-title class="pt-6 px-6 d-flex align-center gap-2">
          <v-icon icon="mdi-lock-reset" color="warning" size="26" />
          <span class="text-h6 font-weight-bold">Nueva contraseña</span>
        </v-card-title>

        <v-card-text class="px-6 pb-2">
          <p class="text-body-2 text-medium-emphasis mb-5">
            Ingresa el token que recibiste en
            <strong>{{ emailData.email }}</strong>
            y escribe tu nueva contraseña.
          </p>

          <v-form ref="formDialog" @submit.prevent="handleVerifyRecovery">

            <v-text-field v-model="recoveryData.tokenRecover" label="Token de recuperación *"
              prepend-inner-icon="mdi-key-outline" variant="outlined" rounded="lg" :rules="[required]"
              hide-details="auto" class="mb-3" />

            <v-text-field v-model="recoveryData.newPassword" label="Nueva contraseña *"
              prepend-inner-icon="mdi-lock-outline"
              :append-inner-icon="showPass ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
              :type="showPass ? 'text' : 'password'" variant="outlined" rounded="lg" :rules="[required, minLength(8)]"
              hide-details="auto" class="mb-3" @click:append-inner="showPass = !showPass" />

            <v-text-field v-model="confirmPassword" label="Confirmar contraseña *"
              prepend-inner-icon="mdi-lock-check-outline"
              :append-inner-icon="showConfirm ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
              :type="showConfirm ? 'text' : 'password'" variant="outlined" rounded="lg" :rules="[required, mustMatch]"
              hide-details="auto" @click:append-inner="showConfirm = !showConfirm" />

          </v-form>
        </v-card-text>

        <v-card-actions class="px-6 pb-6 pt-4">
          <v-btn variant="text" rounded="lg" :disabled="loadingDialog" @click="closeDialog">
            Cancelar
          </v-btn>
          <v-spacer />
          <v-btn color="primary" variant="flat" rounded="lg" size="large" :loading="loadingDialog"
            @click="handleVerifyRecovery">
            <v-icon icon="mdi-check" class="mr-1" /> Confirmar
          </v-btn>
        </v-card-actions>

      </v-card>
    </v-dialog>

    <!-- ── Pantalla principal ── -->
    <v-container class="fill-height" fluid>
      <v-row justify="center" align="center" class="fill-height">
        <v-col cols="12" sm="8" md="5" lg="4">

          <!-- Card -->
          <v-card class="recover-card" rounded="xl" elevation="0">
            <v-card-text class="pa-8">

              <!-- Ícono central decorativo -->
              <div class="text-center mb-5">
                <div class="text-h6 font-weight-bold mt-3">¿Olvidaste tu contraseña?</div>
                <p class="text-body-2 text-medium-emphasis mt-1">
                  Ingresa tu correo y te enviaremos un token para restablecerla.
                </p>
              </div>

              <v-form ref="form" @submit.prevent="handleRecoverPassword">

                <v-text-field v-model="emailData.email" label="Correo electrónico *"
                  prepend-inner-icon="mdi-email-outline" variant="outlined" rounded="lg" type="email"
                  :rules="[required, validEmail]" hide-details="auto" class="mb-5" />

                <v-btn type="submit" :loading="loading" block size="large" rounded="lg" elevation="0" color="primary">
                  <v-icon icon="mdi-send-outline" class="mr-2" /> Enviar token
                </v-btn>

              </v-form>

              <!-- Ya tengo el token -->
              <div class="text-center mt-4">
                <v-btn variant="text" size="small" rounded="lg" color="warning" @click="dialog = true">
                  <v-icon icon="mdi-key-outline" class="mr-1" size="16" />
                  Ya tengo mi token
                </v-btn>
              </div>

            </v-card-text>

            <v-divider />

            <v-card-text class="text-center py-4">
              <span class="text-caption text-medium-emphasis">¿Recordaste tu contraseña?</span>
              <router-link to="/login" class="login-link text-caption font-weight-bold ml-1">
                Inicia sesión
              </router-link>
            </v-card-text>
          </v-card>

        </v-col>
      </v-row>
    </v-container>

  </v-app>
</template>

<style scoped>
.v-application {
  background: #1a1008 !important;
}

.logo-icon {
  color: #e8c97a;
}

.logo-title {
  color: #e8c97a;
  letter-spacing: 2px;
}

.recover-card,
.recovery-card {
  background-color: #2c1f0f !important;
}

/* Ícono decorativo centrado */
.icon-overlay {
  position: relative;
  margin-top: -80px;
}

.login-link {
  color: #e8c97a;
  text-decoration: none;
}

.login-link:hover {
  text-decoration: underline;
}
</style>