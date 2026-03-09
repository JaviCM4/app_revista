<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { magazineService } from '@/services/magazine/magazine.service'
import { categoryMagazineService } from '@/services/types/categoryMagazine.service'
import { subscriptionService } from '@/services/magazine/subscription.service'
import type { NormaResponse } from '@/types/magazine/NormaResponse'
import type { CategoryMagazine } from '@/types/tipos/CategoryMagazine'
import type { SubscriptionRequest } from '@/types/magazine/subscription/SubscriptionRequest'

const router = useRouter()
const authStore = useAuthStore()

type Role = 1 | 2 | 3 | 4
const role = computed<Role | null>(() =>
    authStore.idRole ? Number(authStore.idRole) as Role : null
)

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
function errorMsg(e: unknown) {
    if (typeof e === 'string') return e
    if (e && typeof e === 'object' && 'message' in e) return (e as { message: string }).message
    return 'Ocurrió un error inesperado'
}

// ── Diálogo de suscripción ────────────────────────────────────────────────────
const subDialog = ref(false)
const selectedMag = ref<NormaResponse | null>(null)
const subDate = ref(new Date().toISOString().split('T')[0])  // hoy por defecto
const todayStr = new Date().toISOString().split('T')[0]       // límite máximo
const subscribing = ref(false)

function openSubDialog(mag: NormaResponse) {
    selectedMag.value = mag
    subDate.value = new Date().toISOString().split('T')[0]
    subDialog.value = true
}

// ── Estado ────────────────────────────────────────────────────────────────────
const magazines = ref<NormaResponse[]>([])
const categoryOptions = ref<CategoryMagazine[]>([])
const selectedCategory = ref<number | null>(null)
const tagFilter = ref('')
const loading = ref(false)

async function loadAll() {
    loading.value = true
    try {
        const [data, cats] = await Promise.all([
            magazineService.findAllMagazines(),
            categoryMagazineService.findAllTypeCategoryMagazine(),
        ])
        magazines.value = data
        categoryOptions.value = cats
    } catch (e) {
        notify(errorMsg(e), 'error')
    } finally {
        loading.value = false
    }
}

async function onCategoryChange() {
    tagFilter.value = ''
    loading.value = true
    try {
        magazines.value = selectedCategory.value !== null
            ? await magazineService.findAllByCategory(selectedCategory.value)
            : await magazineService.findAllMagazines()
    } catch (e) {
        notify(errorMsg(e), 'error')
    } finally {
        loading.value = false
    }
}

function clearCategory() {
    selectedCategory.value = null
    onCategoryChange()
}

let tagDebounce: ReturnType<typeof setTimeout>
async function onTagInput() {
    clearTimeout(tagDebounce)
    tagDebounce = setTimeout(async () => {
        loading.value = true
        try {
            if (tagFilter.value.trim()) {
                selectedCategory.value = null
                magazines.value = await magazineService.findAllByTag(tagFilter.value.trim())
            } else {
                magazines.value = await magazineService.findAllMagazines()
            }
        } catch (e) {
            notify(errorMsg(e), 'error')
        } finally {
            loading.value = false
        }
    }, 400)
}

// ── Acciones según rol ────────────────────────────────────────────────────────
async function confirmSubscribe() {
    if (!selectedMag.value) return
    subscribing.value = true
    const payload: SubscriptionRequest = {
        idMagazine: selectedMag.value.id,
        createDate: new Date(subDate.value + 'T12:00:00'),
    }
    try {
        await subscriptionService.createSubscription(payload)
        notify(`Suscrito a "${selectedMag.value.titles}"`, 'success')
        subDialog.value = false
    } catch (e) {
        notify(errorMsg(e), 'error')
    } finally {
        subscribing.value = false
    }
}

function goToEditions(mag: NormaResponse) {
    router.push({ name: 'edition-admin', params: { idMagazine: mag.id } })
}

onMounted(loadAll)
</script>

<template>
    <v-app style="background: #1a1008;">

        <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3500" location="top" rounded="pill">
            <v-icon :icon="snackbar.icon" class="mr-2" />{{ snackbar.message }}
            <template #actions>
                <v-btn icon="mdi-close" variant="text" @click="snackbar.show = false" />
            </template>
        </v-snackbar>

        <v-container class="py-6" style="background: #1a1008;">

            <!-- Encabezado -->
            <div class="mb-6">
                <p class="text-h5 font-weight-bold" style="color:#f5f0e8;">
                    <v-icon icon="mdi-bookshelf" color="#e8c97a" class="mr-2" />
                    Catálogo de revistas
                </p>
                <p class="text-body-2 mt-1" style="color:#c8b8a2;">
                    Filtra por categoría o etiqueta para encontrar lo que buscas
                </p>
            </div>

            <!-- Filtros -->
            <v-card rounded="xl" class="mag-card pa-4 mb-6" elevation="0">
                <v-row align="center" dense>
                    <v-col cols="12" sm="5">
                        <v-select v-model="selectedCategory" :items="categoryOptions" item-title="name" item-value="id"
                            label="Filtrar por categoría" prepend-inner-icon="mdi-bookshelf" variant="outlined"
                            rounded="lg" base-color="#c8b8a2" color="#e8c97a" bg-color="#1a1008"
                            :disabled="tagFilter.trim().length > 0" clearable hide-details
                            @update:model-value="onCategoryChange" />
                    </v-col>
                    <v-col cols="12" sm="2" class="text-center">
                        <span class="text-caption" style="color:#c8b8a2;">— o —</span>
                    </v-col>
                    <v-col cols="12" sm="5">
                        <v-text-field v-model="tagFilter" label="Filtrar por etiqueta"
                            prepend-inner-icon="mdi-label-outline" variant="outlined" rounded="lg" base-color="#c8b8a2"
                            color="#e8c97a" bg-color="#1a1008" :disabled="selectedCategory !== null" clearable
                            hide-details @input="onTagInput" />
                    </v-col>
                </v-row>

                <!-- Chip filtro activo -->
                <div v-if="selectedCategory || tagFilter.trim()" class="mt-3 d-flex align-center gap-2">
                    <span class="text-caption" style="color:#c8b8a2;">Filtro activo:</span>
                    <v-chip size="small" variant="flat" class="chip-active" closable
                        @click:close="selectedCategory ? clearCategory() : (tagFilter = '', onTagInput())">
                        <v-icon icon="mdi-filter-outline" size="14" class="mr-1" />
                        {{selectedCategory
                            ? categoryOptions.find(c => c.id === selectedCategory)?.name ?? selectedCategory
                            : tagFilter
                        }}
                    </v-chip>
                </div>
            </v-card>

            <!-- Loading -->
            <div v-if="loading" class="text-center py-12">
                <v-progress-circular indeterminate color="#e8c97a" size="48" />
            </div>

            <!-- Sin resultados -->
            <div v-else-if="magazines.length === 0" class="text-center py-12">
                <v-icon icon="mdi-newspaper-remove" size="52" color="#c8b8a2" class="mb-3 d-block" />
                <span class="text-body-2" style="color:#c8b8a2;">No hay revistas para mostrar.</span>
            </div>

            <!-- Grid -->
            <v-row v-else>
                <v-col v-for="mag in magazines" :key="mag.id" cols="12" sm="6" md="4">
                    <v-card rounded="xl" class="mag-card h-100 d-flex flex-column" elevation="0">

                        <v-card-title class="pt-4 px-4 pb-1">
                            <span class="text-body-1 font-weight-bold" style="color:#f5f0e8;">{{ mag.titles }}</span>
                        </v-card-title>

                        <v-card-text class="px-4 flex-grow-1">
                            <p class="text-body-2 mb-3" style="color:#c8b8a2;">{{ mag.description }}</p>

                            <div v-if="mag.categories?.length" class="mb-2">
                                <v-icon icon="mdi-bookmark-outline" size="13" color="#e8c97a" class="mr-1" />
                                <v-chip v-for="cat in mag.categories" :key="cat" size="x-small" variant="tonal"
                                    color="#e8c97a" class="mr-1 mb-1">
                                    {{ cat }}
                                </v-chip>
                            </div>

                            <div v-if="mag.tags?.length">
                                <v-icon icon="mdi-pound" size="13" color="#c8b8a2" class="mr-1" />
                                <v-chip v-for="tag in mag.tags" :key="tag" size="x-small" variant="outlined"
                                    color="#c8b8a2" class="mr-1 mb-1">
                                    {{ tag }}
                                </v-chip>
                            </div>
                        </v-card-text>

                        <v-card-actions class="px-4 pb-4 pt-0 mt-auto">
                            <v-spacer />

                            <!-- Rol 3 (suscriptor): botón suscribirse -->
                            <v-btn v-if="role === 3" variant="flat" prepend-icon="mdi-newspaper-plus" rounded="lg"
                                size="small" class="btn-primary" @click="openSubDialog(mag)">
                                Suscribirse
                            </v-btn>

                            <!-- Rol 1 (admin): botón ver ediciones -->
                            <v-btn v-else-if="role === 1" variant="flat" prepend-icon="mdi-book-open-page-variant"
                                rounded="lg" size="small" class="btn-secondary" @click="goToEditions(mag)">
                                Ver ediciones
                            </v-btn>

                        </v-card-actions>

                    </v-card>
                </v-col>
            </v-row>

        </v-container>
        <!-- Diálogo de suscripción con fecha manual -->
        <v-dialog v-model="subDialog" max-width="400" persistent>
            <v-card rounded="xl" style="background:#2c1f0f;" elevation="0">
                <v-card-text class="pa-6">
                    <p class="text-h6 font-weight-bold mb-1" style="color:#f5f0e8;">
                        <v-icon icon="mdi-newspaper-plus" color="#e8c97a" class="mr-2" />
                        Suscribirse
                    </p>
                    <p class="text-body-2 mb-4" style="color:#c8b8a2;">
                        {{ selectedMag?.titles }}
                    </p>

                    <p class="text-caption font-weight-bold mb-2" style="color:#c8b8a2;">FECHA DE SUSCRIPCIÓN</p>
                    <v-text-field v-model="subDate" type="date" :max="todayStr" variant="outlined" rounded="lg"
                        base-color="#c8b8a2" color="#e8c97a" bg-color="#1a1008"
                        prepend-inner-icon="mdi-calendar-outline" hide-details hint="Solo fechas hasta hoy"
                        persistent-hint />
                    <p class="text-caption mt-2" style="color:#c8b8a2;">
                        <v-icon icon="mdi-information-outline" size="13" class="mr-1" />
                        Solo puedes indicar fechas de hoy hacia atrás.
                    </p>
                </v-card-text>
                <v-divider style="border-color:#3d2f20;" />
                <v-card-actions class="pa-4 gap-2">
                    <v-btn variant="text" rounded="lg" style="color:#c8b8a2;" @click="subDialog = false">
                        Cancelar
                    </v-btn>
                    <v-spacer />
                    <v-btn variant="flat" rounded="lg" prepend-icon="mdi-check" class="btn-primary"
                        :loading="subscribing" :disabled="!subDate" @click="confirmSubscribe">
                        Confirmar
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

    </v-app>
</template>

<style scoped>
.mag-card {
    background-color: #2c1f0f !important;
}

.btn-primary {
    background-color: #b5451b !important;
    color: #f5f0e8 !important;
}

.btn-secondary {
    background-color: #e8c97a !important;
    color: #1a1008 !important;
}

.chip-active {
    background-color: #4caf50 !important;
    color: #fff !important;
}
</style>