<template>
  <v-app style="background: #1a1008;">
    <!-- Snackbar -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="3500"
      location="top"
      rounded="pill"
    >
      <v-icon :icon="snackbar.icon" class="mr-2" />
      {{ snackbar.message }}
      <template #actions>
        <v-btn icon="mdi-close" variant="text" @click="snackbar.show = false" />
      </template>
    </v-snackbar>

    <!-- Centrado total -->
    <v-container class="fill-height" fluid>
      <v-row justify="center" align="center" class="fill-height">
        <v-col cols="12" sm="8" md="5" lg="4">

          <!-- Logo / título -->
          <div class="text-center mb-6">
            <v-icon icon="mdi-book-open-page-variant" color="#e8c97a" size="48" />
            <div class="text-h5 font-weight-bold mt-2" style="color: #e8c97a; letter-spacing: 2px;">
              KIOSCO
            </div>
            <div class="text-caption mt-1" style="color: #c8b8a2;">
              Tu mundo de revistas
            </div>
          </div>

          <!-- Card del formulario -->
          <v-card rounded="xl" elevation="0" color="#2c1f0f">
            <v-card-text class="pa-8">

              <div class="text-h6 font-weight-bold mb-1" style="color: #f5f0e8;">
                Iniciar sesión
              </div>
              <div class="text-body-2 mb-6" style="color: #c8b8a2;">
                Accede a tus suscripciones
              </div>

              <v-form ref="form" @submit.prevent="handleLogin">
                <v-text-field
                  v-model="credentials.username"
                  label="Usuario"
                  prepend-inner-icon="mdi-account-outline"
                  variant="outlined"
                  rounded="lg"
                  :rules="[required]"
                  base-color="#c8b8a2"
                  color="#e8c97a"
                  bg-color="#1a1008"
                  class="mb-3"
                  hide-details="auto"
                />

                <v-text-field
                  v-model="credentials.password"
                  label="Contraseña"
                  prepend-inner-icon="mdi-lock-outline"
                  :append-inner-icon="showPass ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                  :type="showPass ? 'text' : 'password'"
                  variant="outlined"
                  rounded="lg"
                  :rules="[required]"
                  base-color="#c8b8a2"
                  color="#e8c97a"
                  bg-color="#1a1008"
                  hide-details="auto"
                  @click:append-inner="showPass = !showPass"
                />

                <div class="text-right mt-2 mb-5">
                  <a href="#" class="text-caption" style="color: #b5451b; text-decoration: none;">
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>

                <v-btn
                  type="submit"
                  :loading="loading"
                  block
                  size="large"
                  rounded="lg"
                  elevation="0"
                  style="background: #b5451b; color: #f5f0e8;"
                >
                  Entrar
                </v-btn>
              </v-form>

            </v-card-text>

            <v-divider color="#3d2f20" />

            <v-card-text class="text-center py-4">
              <span class="text-caption" style="color: #c8b8a2;">
                ¿No tienes cuenta?
              </span>
              <a href="#" class="text-caption font-weight-bold ml-1" style="color: #e8c97a; text-decoration: none;">
                Suscríbete gratis
              </a>
            </v-card-text>
          </v-card>

        </v-col>
      </v-row>
    </v-container>
  </v-app>
</template>

<script setup lang="ts">
    import { ref, reactive } from 'vue'
    import { login } from '@/services/auth/authenticationService'
    import type { AuthenticationRequest } from '@/types/auth/AuthenticationRequest'

    const form     = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)
    const loading  = ref(false)
    const showPass = ref(false)

    const credentials = reactive<AuthenticationRequest>({
        username: '',
        password: '',
    })

    const snackbar = reactive({
        show:    false,
        message: '',
        color:   'success' as string,
        icon:    'mdi-check-circle-outline',
    })

    // Reglas de validación
    const required = (v: string) => !!v || 'Campo obligatorio'

    // Notificaciones
    function notify(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') {
        const map = {
            success: { color: 'success',  icon: 'mdi-check-circle-outline' },
            error:   { color: 'error',    icon: 'mdi-alert-circle-outline' },
            warning: { color: 'warning',  icon: 'mdi-alert-outline' },
            info:    { color: 'info',     icon: 'mdi-information-outline' },
        }
        Object.assign(snackbar, { show: true, message, ...map[type] })
    }

    // Login
    async function handleLogin() {
    const { valid } = await form.value!.validate()
    if (!valid) return

    loading.value = true
        try {
            const response = await login({ ...credentials })

            localStorage.setItem('token', response.token)
            localStorage.setItem('userId', String(response.id))

            notify(`Bienvenido, ${response.username}`, 'success')

            // router.push({ name: 'home' })  ← descomenta cuando tengas el router
        } catch (error: unknown) {
            if (typeof error === 'string') {
                notify(error, 'error')
            } else if (error && typeof error === 'object' && 'message' in error) {
                notify((error as { message: string }).message, 'error')
            } else {
                notify('Error al iniciar sesión. Inténtalo de nuevo.', 'error')
            }
        } finally {
            loading.value = false
        }
    }
</script>