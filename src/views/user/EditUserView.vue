<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { userService } from '@/services/user/user.service'
import { preferenceService } from '@/services/preference/preference.service'
import type { UserFindResponse } from '@/types/user/UserFindResponse'
import type { UserUpdateRequest } from '@/types/user/UserUpdateRequest'
import type { PreferenceFindResponse } from '@/types/preference/PreferenceFindResponse'
import type { PreferenceCategoryFindResponse } from '@/types/preference/PreferenceCategoryFindResponse'

const authStore = useAuthStore()
const form = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)
const loading = ref(false)

// ── Snackbar ──────────────────────────────────────────────────────────────────
const snackbar = reactive({ show: false, message: '', color: 'success' as string, icon: '' })
const notifyMap = {
    success: { color: 'success', icon: 'mdi-check-circle-outline' },
    error: { color: 'error', icon: 'mdi-alert-circle-outline' },
    warning: { color: 'warning', icon: 'mdi-alert-outline' },
} as const
function notify(message: string, type: keyof typeof notifyMap = 'success') {
    Object.assign(snackbar, { show: true, message, ...notifyMap[type] })
}

// ── Roles ─────────────────────────────────────────────────────────────────────
// 1 = Admin | 2 = Editor | 3 = Subscriber | 4 = Advertiser
type Role = 1 | 2 | 3 | 4
const role = computed<Role | null>(() =>
    authStore.idRole ? Number(authStore.idRole) as Role : null
)

const showMoneySection = computed(() => role.value === 2 || role.value === 4)
const showPreferencesSection = computed(() => role.value === 3)

// ── Estado general ────────────────────────────────────────────────────────────
const user = ref<UserFindResponse | null>(null)
const preferences = ref<PreferenceFindResponse[]>([])
const allCategories = ref<PreferenceCategoryFindResponse[]>([])
const loadingPreferences = ref(false)
const currentMoney = ref(0)
const moneyInput = ref('')
const updatingMoney = ref(false)

// ── Filtros en cascada ────────────────────────────────────────────────────────
const selectedMagazineCategory = ref<string | null>(null)
const selectedPreferenceType = ref<string | null>(null)
const newPreferenceId = ref<number | null>(null)

const magazineCategoryOptions = computed(() =>
    [...new Set(allCategories.value.map(c => c.typeCategoryMagazineName))].sort()
)

const preferenceTypeOptions = computed(() => {
    if (!selectedMagazineCategory.value) return []
    return [
        ...new Set(
            allCategories.value
                .filter(c => c.typeCategoryMagazineName === selectedMagazineCategory.value)
                .map(c => c.typePreferenceName)
        ),
    ].sort()
})

const preferenceNameOptions = computed(() => {
    if (!selectedMagazineCategory.value || !selectedPreferenceType.value) return []
    return allCategories.value
        .filter(c =>
            c.typeCategoryMagazineName === selectedMagazineCategory.value &&
            c.typePreferenceName === selectedPreferenceType.value
        )
        .map(c => ({ title: c.name, value: c.id }))
})

function onMagazineCategoryChange() {
    selectedPreferenceType.value = null
    newPreferenceId.value = null
}
function onPreferenceTypeChange() {
    newPreferenceId.value = null
}

// ── Formulario de edición ─────────────────────────────────────────────────────
const model = reactive<UserUpdateRequest>({
    names: '',
    lastNames: '',
    dateOfBirth: null,
    photography: null,
    description: null,
})

// ── Validaciones ──────────────────────────────────────────────────────────────
const required = (v: string) => !!v?.trim() || 'Campo obligatorio'
const maxLen = (len = 255) => (v: string) => (!v || v.length <= len) || `Máximo ${len} caracteres`
const positiveNumber = (v: string) => !v || Number(v) >= 0 || 'Debe ser un número positivo'

// ── Carga inicial ─────────────────────────────────────────────────────────────
onMounted(findMyUser)

async function findMyUser() {
    loading.value = true
    try {
        const res = await userService.findMyUser()
        user.value = res
        currentMoney.value = res.availableMoney
        model.names = res.names
        model.lastNames = res.lastNames
        model.dateOfBirth = res.dateOfBirth ?? null
        model.photography = res.photography ?? null
        model.description = res.description ?? null

        const tasks: Promise<void>[] = []
        if (showPreferencesSection.value) {
            tasks.push(loadPreferences(), loadAllCategories())
        }
        await Promise.all(tasks)
    } catch (e: unknown) {
        notify(errorMsg(e), 'error')
    } finally {
        loading.value = false
    }
}

async function loadPreferences() {
    loadingPreferences.value = true
    try {
        preferences.value = await preferenceService.findMyPreferences()
    } catch (e: unknown) {
        notify(errorMsg(e), 'error')
    } finally {
        loadingPreferences.value = false
    }
}

async function loadAllCategories() {
    try {
        const result = await preferenceService.findAllPreferenceAndCategory()
        allCategories.value = Array.isArray(result)
            ? result
            : ((result as { data?: PreferenceCategoryFindResponse[] }).data ?? [])
    } catch (e: unknown) {
        notify(errorMsg(e), 'error')
    }
}

// ── Guardar perfil ────────────────────────────────────────────────────────────
async function handleSave() {
    const { valid } = await form.value!.validate()
    if (!valid) return
    loading.value = true
    try {
        await userService.updateUser({ ...model })
        notify('Perfil actualizado correctamente', 'success')
        await findMyUser()
    } catch (e: unknown) {
        notify(errorMsg(e), 'error')
    } finally {
        loading.value = false
    }
}

// ── Actualizar dinero ─────────────────────────────────────────────────────────
async function handleSaveMoney() {
    const amount = Number(moneyInput.value)
    if (!amount || amount <= 0) { notify('Ingresa una cantidad válida', 'warning'); return }
    updatingMoney.value = true
    try {
        await userService.updateMoney(amount)
        const updatedUser = await userService.findMyUser()
        currentMoney.value = updatedUser.availableMoney
        moneyInput.value = ''
        notify('Saldo actualizado correctamente', 'success')
    } catch (e: unknown) {
        notify(errorMsg(e), 'error')
    } finally {
        updatingMoney.value = false
    }
}

// ── Agregar preferencia ───────────────────────────────────────────────────────
async function handleCreatePreference() {
    if (!newPreferenceId.value) { notify('Selecciona una opción', 'warning'); return }
    loadingPreferences.value = true
    try {
        await preferenceService.createPreference({ idCategoryPreference: newPreferenceId.value })
        selectedMagazineCategory.value = null
        selectedPreferenceType.value = null
        newPreferenceId.value = null
        notify('Preferencia agregada', 'success')
        await loadPreferences()
    } catch (e: unknown) {
        notify(errorMsg(e), 'error')
    } finally {
        loadingPreferences.value = false
    }
}

// ── Eliminar preferencia ──────────────────────────────────────────────────────
async function handleDeletePreference(idPreference: number) {
    loadingPreferences.value = true
    try {
        await preferenceService.deletePreference(idPreference)
        notify('Preferencia eliminada', 'success')
        await loadPreferences()
    } catch (e: unknown) {
        notify(errorMsg(e), 'error')
    } finally {
        loadingPreferences.value = false
    }
}

function errorMsg(e: unknown): string {
    if (typeof e === 'string') return e
    if (e && typeof e === 'object' && 'message' in e) return (e as { message: string }).message
    return 'Ocurrió un error inesperado'
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

        <v-container fluid class="py-8">
            <v-row justify="center">
                <v-col cols="12" md="10" lg="8">

                    <!-- ── Tarjeta de perfil ── -->
                    <v-card rounded="xl" class="pa-6 profile-card mb-4">
                        <v-card-title class="text-h6 font-weight-bold mb-3">Mi Perfil</v-card-title>
                        <v-row align="center">
                            <v-col cols="12" sm="3" class="text-center">
                                <v-avatar size="120" color="teal-darken-4" class="mb-3">
                                    <v-img v-if="user?.photography" :src="user.photography" cover />
                                    <v-icon v-else icon="mdi-account" size="60" color="white" />
                                </v-avatar>
                            </v-col>
                            <v-col cols="12" sm="9">
                                <p class="text-h6 font-weight-bold mb-2">
                                    {{ user?.names }} {{ user?.lastNames }}
                                </p>
                                <div class="d-flex flex-wrap gap-2 mb-3">
                                    <v-chip size="small" color="teal" variant="tonal" prepend-icon="mdi-account-badge">
                                        {{ user?.userTypeName }}
                                    </v-chip>
                                    <v-chip size="small" color="success" variant="tonal" prepend-icon="mdi-circle">
                                        {{ user?.userStatusName }}
                                    </v-chip>
                                    <v-chip size="small" variant="tonal" prepend-icon="mdi-gender-male-female">
                                        {{ user?.sexTypeName }}
                                    </v-chip>
                                    <v-chip size="small" variant="tonal" prepend-icon="mdi-map-marker-outline">
                                        {{ user?.municipalityName }}
                                    </v-chip>
                                </div>
                                <p v-if="user?.description" class="text-body-2 text-medium-emphasis">
                                    {{ user.description }}
                                </p>
                            </v-col>
                        </v-row>
                    </v-card>

                    <!-- ── Editar información (todos los roles) ── -->
                    <v-card rounded="xl" class="pa-6 profile-card mb-4">
                        <v-card-title class="text-h6 font-weight-bold">Editar información</v-card-title>
                        <v-card-text>
                            <v-form ref="form" @submit.prevent="handleSave">
                                <v-row dense>
                                    <v-col cols="12" sm="6">
                                        <v-text-field v-model="model.names" label="Nombres *"
                                            prepend-inner-icon="mdi-account-outline" variant="outlined" rounded="lg"
                                            :rules="[required, maxLen(100)]" hide-details="auto" class="mb-3" />
                                    </v-col>
                                    <v-col cols="12" sm="6">
                                        <v-text-field v-model="model.lastNames" label="Apellidos *"
                                            prepend-inner-icon="mdi-account-outline" variant="outlined" rounded="lg"
                                            :rules="[required, maxLen(100)]" hide-details="auto" class="mb-3" />
                                    </v-col>
                                </v-row>

                                <v-text-field v-model="model.dateOfBirth" label="Fecha de nacimiento"
                                    prepend-inner-icon="mdi-calendar-outline" variant="outlined" rounded="lg"
                                    type="date" :max="new Date().toISOString().split('T')[0]" hide-details="auto"
                                    class="mb-3" />

                                <v-text-field v-model="model.photography" label="URL de fotografía"
                                    prepend-inner-icon="mdi-image-outline" variant="outlined" rounded="lg"
                                    :rules="[maxLen(255)]" hide-details="auto" class="mb-3" />

                                <v-textarea v-model="model.description" label="Descripción"
                                    prepend-inner-icon="mdi-text-outline" variant="outlined" rounded="lg"
                                    :rules="[maxLen(500)]" rows="3" auto-grow hide-details="auto" class="mb-4" />

                                <v-btn type="submit" :loading="loading" color="primary" block rounded="lg" size="large">
                                    <v-icon icon="mdi-content-save" class="mr-1" /> Guardar cambios
                                </v-btn>
                            </v-form>
                        </v-card-text>
                    </v-card>

                    <!-- ── Dinero (solo Editor=2 y Advertiser=4) ── -->
                    <v-card v-if="showMoneySection" rounded="xl" class="pa-6 profile-card mb-4">
                        <v-card-title class="text-h6 font-weight-bold">Dinero disponible</v-card-title>
                        <v-card-text>
                            <div class="mb-4">
                                <p class="text-caption text-medium-emphasis mb-1">Saldo actual</p>
                                <p class="text-h4 font-weight-bold money-amount">
                                    Q {{ currentMoney.toFixed(2) }}
                                </p>
                            </div>
                            <v-row align="center">
                                <v-col cols="12" sm="8">
                                    <v-text-field v-model="moneyInput" type="number" step="0.01"
                                        label="Cantidad a agregar" prepend-inner-icon="mdi-currency-usd"
                                        variant="outlined" rounded="lg" :rules="[positiveNumber]" hide-details="auto" />
                                </v-col>
                                <v-col cols="12" sm="4">
                                    <v-btn :loading="updatingMoney" color="primary" block rounded="lg" size="large"
                                        @click="handleSaveMoney">
                                        <v-icon icon="mdi-check" class="mr-1" /> Actualizar
                                    </v-btn>
                                </v-col>
                            </v-row>
                        </v-card-text>
                    </v-card>

                    <!-- ── Preferencias (solo Subscriber=3) ── -->
                    <v-card v-if="showPreferencesSection" rounded="xl" class="pa-6 profile-card">
                        <v-card-title class="text-h6 font-weight-bold mb-1">Mis preferencias</v-card-title>
                        <v-card-subtitle class="text-caption mb-4">
                            Selecciona hasta 3 niveles para agregar una nueva preferencia
                        </v-card-subtitle>

                        <v-card-text>

                            <!-- Filtros en cascada -->
                            <v-row dense class="mb-2">
                                <v-col cols="12" sm="4">
                                    <v-select v-model="selectedMagazineCategory" label="Categoría de revista"
                                        prepend-inner-icon="mdi-bookshelf" :items="magazineCategoryOptions"
                                        variant="outlined" rounded="lg" clearable hide-details="auto"
                                        @update:model-value="onMagazineCategoryChange" />
                                </v-col>
                                <v-col cols="12" sm="4">
                                    <v-select v-model="selectedPreferenceType" label="Tipo de preferencia"
                                        prepend-inner-icon="mdi-tag-outline" :items="preferenceTypeOptions"
                                        :disabled="!selectedMagazineCategory" variant="outlined" rounded="lg" clearable
                                        hide-details="auto" @update:model-value="onPreferenceTypeChange" />
                                </v-col>
                                <v-col cols="12" sm="4">
                                    <v-select v-model="newPreferenceId" label="Preferencia"
                                        prepend-inner-icon="mdi-heart-outline" :items="preferenceNameOptions"
                                        item-title="title" item-value="value" :disabled="!selectedPreferenceType"
                                        variant="outlined" rounded="lg" hide-details="auto" />
                                </v-col>
                            </v-row>

                            <v-btn :loading="loadingPreferences" :disabled="!newPreferenceId" color="success"
                                rounded="lg" size="large" class="mb-5 mt-2" @click="handleCreatePreference">
                                <v-icon icon="mdi-plus" class="mr-1" /> Agregar preferencia
                            </v-btn>

                            <v-divider class="mb-4" />

                            <p class="text-caption font-weight-bold mb-3">
                                Tus preferencias actuales
                                <v-chip size="x-small" color="primary" variant="flat" class="ml-2">
                                    {{ preferences.length }}
                                </v-chip>
                            </p>

                            <div v-if="loadingPreferences" class="text-center py-4">
                                <v-progress-circular indeterminate color="primary" size="32" />
                            </div>

                            <div v-else-if="preferences.length === 0"
                                class="text-center text-caption text-medium-emphasis pa-6">
                                <v-icon icon="mdi-heart-off-outline" size="36" class="mb-2 d-block" />
                                No tienes preferencias agregadas aún
                            </div>

                            <v-list v-else class="pa-0">
                                <v-list-item v-for="pref in preferences" :key="pref.idPreference"
                                    class="preference-item rounded-lg mb-2 pa-3">
                                    <template #prepend>
                                        <v-icon icon="mdi-heart" color="error" size="18" class="mr-2" />
                                    </template>
                                    <v-list-item-title class="text-body-2">
                                        {{ pref.categoryName }}
                                    </v-list-item-title>
                                    <template #append>
                                        <v-btn icon="mdi-delete-outline" size="small" variant="text" color="error"
                                            :loading="loadingPreferences"
                                            @click="handleDeletePreference(pref.idPreference)" />
                                    </template>
                                </v-list-item>
                            </v-list>

                        </v-card-text>
                    </v-card>

                </v-col>
            </v-row>
        </v-container>
    </v-app>
</template>

<style scoped>
.profile-card {
    background-color: #2c1f0f !important;
}

.money-amount {
    color: #e8c97a;
}

.preference-item {
    background: rgba(232, 201, 122, 0.08) !important;
    border-left: 3px solid #e8c97a;
}

.preference-item:hover {
    background: rgba(232, 201, 122, 0.15) !important;
    cursor: default;
}
</style>