<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { userService } from '@/services/user/user.service'
import type { UserCreateAdminRequest } from '@/types/user/UserCreateAdminRequest'
import { departments } from '@/resources/locations'

const router = useRouter()

const today = new Date().toISOString().split('T')[0] || ''
const form = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)
const loading = ref(false)
const step = ref(1)
const totalSteps = 3

const departamento = ref<number | null>(null)
const municipioNombre = ref('')

const formData = reactive<UserCreateAdminRequest>({
  idUserType: 0,
  userStatus: 1,
  sexType: 0,
  municipioId: 0,
  username: '',
  names: '',
  lastNames: '',
  dateOfBirth: null,
  photography: null,
  description: null,
  phone: 0,
  email: '',
})

// ── Snackbar ──────────────────────────────────────────────────────────────────
const snackbar = reactive({ show: false, message: '', color: 'success' as string, icon: 'mdi-check-circle-outline' })
const notifyMap = {
  success: { color: 'success', icon: 'mdi-check-circle-outline' },
  error: { color: 'error', icon: 'mdi-alert-circle-outline' },
  warning: { color: 'warning', icon: 'mdi-alert-outline' },
} as const
function notify(message: string, type: keyof typeof notifyMap = 'success') {
  Object.assign(snackbar, { show: true, message, ...notifyMap[type] })
}

// ── Validaciones ──────────────────────────────────────────────────────────────
const required = (v: string | number | null) => (v !== '' && v !== 0 && v !== null) || 'Campo obligatorio'
const validEmail = (v: string) => /.+@.+\..+/.test(v) || 'Correo inválido'
const minLength = (n: number) => (v: string) => (v?.length ?? 0) >= n || `Mínimo ${n} caracteres`
const maxToday = (v: string) => !v || v <= today || 'La fecha no puede ser mayor a hoy'

// ── Tipo de usuario ───────────────────────────────────────────────────────────
const userTypeOptions = [
  { title: 'Suscriptor', value: 3, icon: 'mdi-account-outline', description: 'Lee y comenta revistas' },
  { title: 'Editor', value: 2, icon: 'mdi-pencil-box-outline', description: 'Publica y gestiona contenido' },
  { title: 'Anunciante', value: 4, icon: 'mdi-bullhorn-outline', description: 'Promociona productos y servicios' },
]
const selectedUserType = computed(() =>
  userTypeOptions.find(u => u.value === formData.idUserType)
)

// ── Opciones de sexo ──────────────────────────────────────────────────────────
const sexOptions = [
  { title: 'Masculino', value: 1, icon: 'mdi-gender-male' },
  { title: 'Femenino', value: 2, icon: 'mdi-gender-female' },
  { title: 'Otro', value: 3, icon: 'mdi-gender-non-binary' },
]

// ── Departamento → Municipio ──────────────────────────────────────────────────
const municipios = computed(() => {
  const dept = departments.find(d => d.id === departamento.value)
  return dept ? dept.municipios : []
})

function onDepartamentoChange() {
  municipioNombre.value = ''
  formData.municipioId = 0
}

function onMunicipioChange(nombre: string) {
  municipioNombre.value = nombre
  if (!departamento.value) { formData.municipioId = 0; return }
  const deptIndex = departments.findIndex(d => d.id === departamento.value)
  if (deptIndex < 0) { formData.municipioId = 0; return }
  const dept = departments[deptIndex]!
  const idx = dept.municipios.indexOf(nombre)
  if (idx < 0) { formData.municipioId = 0; return }
  let offset = 0
  for (let i = 0; i < deptIndex; i++) {
    const d = departments[i]
    if (d) offset += d.municipios.length
  }
  formData.municipioId = offset + idx + 1
}

// ── Navegación de pasos ───────────────────────────────────────────────────────
async function nextStep() {
  if (step.value === 1) {
    if (formData.idUserType === 0) { notify('Selecciona un tipo de cuenta', 'warning'); return }
    step.value = 2; return
  }
  if (step.value === 2) {
    if (formData.sexType === 0) { notify('Selecciona una opción de sexo', 'warning'); return }
    const { valid } = await form.value!.validate()
    if (valid) step.value = 3
  }
}
function prevStep() { step.value-- }

// ── Submit ────────────────────────────────────────────────────────────────────
async function handleRegister() {
  const { valid } = await form.value!.validate()
  if (!valid) return
  loading.value = true
  try {
    const res = await userService.createUserAndCredentialAdmin({ ...formData })

    // Mostrar el mensaje y esperar 2.5s para que el usuario lo lea
    notify(`¡Cuenta creada! Bienvenido, ${res.names} ${res.lastNames}`, 'success')
    await new Promise(resolve => setTimeout(resolve, 2500))
    router.push({ name: 'login' })

  } catch (e: unknown) {
    notify(errorMessage(e), 'error')
  } finally {
    loading.value = false
  }
}

function errorMessage(e: unknown): string {
  if (typeof e === 'string') return e
  if (e && typeof e === 'object' && 'message' in e) return (e as { message: string }).message
  return 'Ocurrió un error. Inténtalo de nuevo.'
}
</script>

<template>
  <v-app style="background: #1a1008;">

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" location="top" rounded="pill">
      <v-icon :icon="snackbar.icon" class="mr-2" />
      {{ snackbar.message }}
      <template #actions>
        <v-btn icon="mdi-close" variant="text" @click="snackbar.show = false" />
      </template>
    </v-snackbar>

    <v-container class="fill-height" fluid style="background: #1a1008;">
      <v-row justify="center" align="center" class="py-8">
        <v-col cols="12" sm="10" md="7" lg="5">

          <!-- Card -->
          <v-card class="register-card" rounded="xl" elevation="0">
            <v-card-text class="pa-8">

              <!-- Header + stepper -->
              <div class="d-flex align-center justify-space-between mb-3">
                <div>
                  <p class="text-h6 font-weight-bold mb-0" style="color:#f5f0e8;">Crear cuenta</p>
                  <p class="text-body-2 mb-0" style="color:#c8b8a2;">
                    <template v-if="step === 1">Paso 1 · Tipo de cuenta</template>
                    <template v-else-if="step === 2">Paso 2 · Datos personales</template>
                    <template v-else>Paso 3 · Datos de acceso</template>
                  </p>
                </div>
                <div class="d-flex align-center">
                  <template v-for="n in totalSteps" :key="n">
                    <div class="step-dot" :class="{ active: step === n, done: step > n }">
                      <v-icon v-if="step > n" icon="mdi-check" size="12" />
                      <span v-else>{{ n }}</span>
                    </div>
                    <div v-if="n < totalSteps" class="step-line" />
                  </template>
                </div>
              </div>

              <v-divider class="mb-6" style="border-color:#3d2f20;" />

              <v-form ref="form" @submit.prevent="step < totalSteps ? nextStep() : handleRegister()">

                <!-- ══ PASO 1 ══ -->
                <template v-if="step === 1">
                  <p class="text-body-2 mb-4" style="color:#c8b8a2;">
                    Selecciona el tipo de cuenta que deseas crear. Puedes elegir entre suscriptor, editor o anunciante.
                  </p>
                  <div class="d-flex flex-column gap-3">
                    <v-card v-for="opt in userTypeOptions" :key="opt.value" rounded="lg" elevation="0"
                      :class="['user-type-card', { 'user-type-selected': formData.idUserType === opt.value }]"
                      @click="formData.idUserType = opt.value">
                      <v-card-text class="d-flex align-center gap-4 pa-4">
                        <v-avatar size="44" :color="formData.idUserType === opt.value ? '#b5451b' : '#3d2f20'">
                          <v-icon :icon="opt.icon" :color="formData.idUserType === opt.value ? '#f5f0e8' : '#c8b8a2'" />
                        </v-avatar>
                        <div class="flex-grow-1">
                          <p class="font-weight-bold mb-0" style="color:#f5f0e8;">{{ opt.title }}</p>
                          <p class="text-caption mb-0" style="color:#c8b8a2;">{{ opt.description }}</p>
                        </div>
                        <v-icon :icon="formData.idUserType === opt.value ? 'mdi-check-circle' : 'mdi-circle-outline'"
                          :color="formData.idUserType === opt.value ? '#4caf50' : '#3d2f20'" size="22" />
                      </v-card-text>
                    </v-card>
                  </div>
                </template>

                <!-- ══ PASO 2 ══ -->
                <template v-else-if="step === 2">
                  <v-chip size="small" variant="flat" class="mb-4" style="background:#3d2f20; color:#e8c97a;">
                    <v-icon :icon="selectedUserType?.icon" size="14" class="mr-1" />
                    {{ selectedUserType?.title }}
                  </v-chip>

                  <v-row dense>
                    <v-col cols="12" sm="6">
                      <v-text-field v-model="formData.names" label="Nombres *" prepend-inner-icon="mdi-account-outline"
                        variant="outlined" rounded="lg" base-color="#c8b8a2" color="#e8c97a" bg-color="#1a1008"
                        :rules="[required]" hide-details="auto" />
                    </v-col>
                    <v-col cols="12" sm="6">
                      <v-text-field v-model="formData.lastNames" label="Apellidos *"
                        prepend-inner-icon="mdi-account-outline" variant="outlined" rounded="lg" base-color="#c8b8a2"
                        color="#e8c97a" bg-color="#1a1008" :rules="[required]" hide-details="auto" />
                    </v-col>
                  </v-row>

                  <div class="mt-4">
                    <p class="text-caption mb-2" style="color:#c8b8a2;">Sexo *</p>
                    <div class="d-flex gap-2">
                      <v-btn v-for="opt in sexOptions" :key="opt.value" :prepend-icon="opt.icon"
                        :variant="formData.sexType === opt.value ? 'flat' : 'tonal'" rounded="lg" size="small"
                        class="sex-btn"
                        :style="formData.sexType === opt.value ? 'background:#b5451b!important;color:#f5f0e8!important;' : 'color:#c8b8a2;'"
                        @click="formData.sexType = opt.value">{{ opt.title }}</v-btn>
                    </div>
                  </div>

                  <v-row dense class="mt-4">
                    <v-col cols="12" sm="6">
                      <v-select v-model="departamento" label="Departamento *" prepend-inner-icon="mdi-map-outline"
                        :items="departments" item-title="name" item-value="id" variant="outlined" rounded="lg"
                        base-color="#c8b8a2" color="#e8c97a" bg-color="#1a1008" :rules="[required]" hide-details="auto"
                        @update:model-value="onDepartamentoChange" />
                    </v-col>
                    <v-col cols="12" sm="6">
                      <v-select v-model="municipioNombre" label="Municipio *"
                        prepend-inner-icon="mdi-map-marker-outline" :items="municipios" :disabled="!departamento"
                        variant="outlined" rounded="lg" base-color="#c8b8a2" color="#e8c97a" bg-color="#1a1008"
                        :rules="[required]" hide-details="auto" @update:model-value="onMunicipioChange" />
                    </v-col>
                  </v-row>

                  <v-row dense class="mt-3">
                    <v-col cols="12" sm="6">
                      <v-text-field v-model.number="formData.phone" label="Teléfono *"
                        prepend-inner-icon="mdi-phone-outline" variant="outlined" rounded="lg" type="number"
                        base-color="#c8b8a2" color="#e8c97a" bg-color="#1a1008" :rules="[required]"
                        hide-details="auto" />
                    </v-col>
                    <v-col cols="12" sm="6">
                      <v-text-field v-model="formData.dateOfBirth" label="Fecha de nacimiento"
                        prepend-inner-icon="mdi-calendar-outline" variant="outlined" rounded="lg" type="date"
                        :max="today" base-color="#c8b8a2" color="#e8c97a" bg-color="#1a1008" :rules="[maxToday]"
                        hide-details="auto" />
                    </v-col>
                  </v-row>

                  <v-textarea v-model="formData.description" label="Descripción (opcional)"
                    prepend-inner-icon="mdi-text-outline" variant="outlined" rounded="lg" rows="2" auto-grow
                    base-color="#c8b8a2" color="#e8c97a" bg-color="#1a1008" hide-details="auto" class="mt-3" />
                </template>

                <!-- ══ PASO 3 ══ -->
                <template v-else>
                  <v-chip size="small" variant="flat" class="mb-4" style="background:#3d2f20; color:#e8c97a;">
                    <v-icon :icon="selectedUserType?.icon" size="14" class="mr-1" />
                    {{ selectedUserType?.title }}
                  </v-chip>

                  <v-text-field v-model="formData.username" label="Nombre de usuario *" prepend-inner-icon="mdi-at"
                    variant="outlined" rounded="lg" base-color="#c8b8a2" color="#e8c97a" bg-color="#1a1008"
                    :rules="[required, minLength(4)]" hide-details="auto" class="mb-3" />
                  <v-text-field v-model="formData.email" label="Correo electrónico *"
                    prepend-inner-icon="mdi-email-outline" variant="outlined" rounded="lg" type="email"
                    base-color="#c8b8a2" color="#e8c97a" bg-color="#1a1008" :rules="[required, validEmail]"
                    hide-details="auto" class="mb-3" />
                  <p class="text-caption mt-2 ml-1" style="color:#c8b8a2;">Mínimo 8 caracteres.</p>
                </template>

                <!-- Botones -->
                <div class="d-flex gap-3 mt-6">
                  <v-btn v-if="step > 1" variant="text" rounded="lg" size="large" style="color:#c8b8a2;"
                    :disabled="loading" @click="prevStep">
                    <v-icon icon="mdi-arrow-left" class="mr-1" /> Atrás
                  </v-btn>
                  <v-spacer v-if="step > 1" />
                  <v-btn type="submit" :loading="loading" :block="step === 1" size="large" rounded="lg" elevation="0"
                    class="btn-primary">
                    <template v-if="step < totalSteps">Continuar <v-icon icon="mdi-arrow-right"
                        class="ml-1" /></template>
                    <template v-else>Crear cuenta <v-icon icon="mdi-check" class="ml-1" /></template>
                  </v-btn>
                </div>

              </v-form>
            </v-card-text>

            <v-divider style="border-color:#3d2f20;" />

            <v-card-text class="text-center py-4">
              <span class="text-caption" style="color:#c8b8a2;">¿Ya tienes cuenta?</span>
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
.logo-title {
  color: #e8c97a;
  letter-spacing: 2px;
}

.register-card {
  background-color: #2c1f0f !important;
}

.step-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #3d2f20;
  color: #c8b8a2;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.25s, color 0.25s;
}

.step-dot.active {
  background: #b5451b;
  color: #f5f0e8;
}

.step-dot.done {
  background: #4caf50;
  color: #fff;
}

.step-line {
  width: 24px;
  height: 2px;
  background: #3d2f20;
  border-radius: 2px;
}

.user-type-card {
  background: #1a1008 !important;
  border: 1.5px solid #3d2f20;
  cursor: pointer;
  transition: border-color 0.2s;
}

.user-type-card:hover {
  border-color: #c8b8a2;
}

.user-type-selected {
  border-color: #b5451b !important;
}

.sex-btn {
  flex: 1 1 0;
}

.btn-primary {
  background-color: #b5451b !important;
  color: #f5f0e8 !important;
}

.login-link {
  color: #e8c97a;
  text-decoration: none;
}

.login-link:hover {
  text-decoration: underline;
}
</style>