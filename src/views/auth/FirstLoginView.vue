<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authService } from '@/services/auth/auth.service'
import type { FirstRequest } from '@/types/auth/FirstRequest'

const route = useRoute()
const router = useRouter()

const form = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)
const loading = ref(false)
const showPass = ref(false)
const showConfirm = ref(false)

function queryString(value: unknown): string {
    return typeof value === 'string' ? value : ''
}

const data = reactive<FirstRequest>({
    username: queryString(route.query.username),
    password: '',
    token: queryString(route.query.token),
})

const confirmPassword = ref('')

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
} as const

function notify(message: string, type: keyof typeof notifyMap = 'success') {
    Object.assign(snackbar, { show: true, message, ...notifyMap[type] })
}

const required = (v: string) => !!v?.trim() || 'Campo obligatorio'
const minLength = (n: number) => (v: string) => (v?.length ?? 0) >= n || `Minimo ${n} caracteres`
const mustMatch = (v: string) => v === data.password || 'Las contrasenas no coinciden'

function errorMessage(e: unknown): string {
    if (typeof e === 'string') return e
    if (e && typeof e === 'object' && 'message' in e) return (e as { message: string }).message
    return 'Ocurrio un error. Intentalo de nuevo.'
}

async function handleFirstLogin() {
    if (!form.value) return

    const { valid } = await form.value.validate()
    if (!valid) return

    loading.value = true
    try {
        await authService.firstLogin({ ...data })
        notify('Contrasena actualizada. Inicia sesion para continuar.', 'success')
        setTimeout(() => {
            router.push({ name: 'login' })
        }, 900)
    } catch (e: unknown) {
        notify(errorMessage(e), 'error')
    } finally {
        loading.value = false
    }
}
</script>

<template>
    <v-app>

        <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3500" location="top" rounded="pill">
            <v-icon :icon="snackbar.icon" class="mr-2" />
            {{ snackbar.message }}
            <template #actions>
                <v-btn icon="mdi-close" variant="text" @click="snackbar.show = false" />
            </template>
        </v-snackbar>

        <v-container class="fill-height" fluid>
            <v-row justify="center" align="center" class="fill-height">
                <v-col cols="12" sm="8" md="5" lg="4">

                    <v-card class="first-login-card" rounded="xl" elevation="0">
                        <v-card-text class="pa-8">
                            <p class="text-h6 font-weight-bold mb-1">Actualizar credenciales</p>
                            <p class="text-body-2 text-medium-emphasis mb-6">
                                Ingresa tus datos y confirma tu contrasena para activar tu cuenta.
                            </p>

                            <v-form ref="form" @submit.prevent="handleFirstLogin">
                                <v-text-field v-model="data.username" label="Usuario"
                                    prepend-inner-icon="mdi-account-outline" variant="outlined" rounded="lg"
                                    :rules="[required]" hide-details="auto" class="mb-3" />

                                <v-text-field v-model="data.token" label="Token" prepend-inner-icon="mdi-key-outline"
                                    variant="outlined" rounded="lg" :rules="[required]" hide-details="auto"
                                    class="mb-3" />

                                <v-text-field v-model="data.password" label="Nueva contrasena"
                                    prepend-inner-icon="mdi-lock-outline"
                                    :append-inner-icon="showPass ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                                    :type="showPass ? 'text' : 'password'" variant="outlined" rounded="lg"
                                    :rules="[required, minLength(8)]" hide-details="auto" class="mb-3"
                                    @click:append-inner="showPass = !showPass" />

                                <v-text-field v-model="confirmPassword" label="Confirmar contrasena"
                                    prepend-inner-icon="mdi-lock-check-outline"
                                    :append-inner-icon="showConfirm ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                                    :type="showConfirm ? 'text' : 'password'" variant="outlined" rounded="lg"
                                    :rules="[required, mustMatch]" hide-details="auto" class="mb-5"
                                    @click:append-inner="showConfirm = !showConfirm" />

                                <v-btn type="submit" :loading="loading" block size="large" rounded="lg" elevation="0"
                                    color="primary">
                                    Confirmar
                                </v-btn>
                            </v-form>
                        </v-card-text>

                        <v-divider />

                        <v-card-text class="text-center py-4">
                            <span class="text-caption text-medium-emphasis">Ya realizaste el cambio?</span>
                            <router-link to="/login" class="login-link text-caption font-weight-bold ml-1">
                                Inicia sesion
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

.first-login-card {
    background-color: #2c1f0f !important;
}

.login-link {
    color: #e8c97a;
    text-decoration: none;
}

.login-link:hover {
    text-decoration: underline;
}
</style>
