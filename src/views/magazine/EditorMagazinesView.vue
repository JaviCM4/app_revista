<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { magazineService } from '@/services/magazine/magazine.service'
import { categoryService } from '@/services/magazine/category.service'
import { categoryMagazineService } from '@/services/types/categoryMagazine.service'
import { tagService } from '@/services/magazine/tag.service'
import type { AdminAndEditorResponse } from '@/types/magazine/AdminAndEditorResponse'
import type { MagazineCreateRequest } from '@/types/magazine/MagazineCreateRequest'
import type { UpdatePermissionsRequest } from '@/types/magazine/UpdatePermissionsRequest'
import type { CategoryResponse } from '@/types/magazine/category/CategoryResponse'
import type { TagResponse } from '@/types/magazine/tag/TagResponse'
import type { CategoryMagazine } from '@/types/tipos/CategoryMagazine'

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

const router = useRouter()

function goToAds(idMagazine: number) {
    router.push({ name: 'ad-block', params: { idMagazine } })
}

function goToEditions(idMagazine: number) {
    router.push({ name: 'edition-editor', params: { idMagazine } })
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const tab = ref<'manage' | 'create'>('manage')

// ── Revistas ──────────────────────────────────────────────────────────────────
const magazines = ref<AdminAndEditorResponse[]>([])
const loadingMags = ref(false)

async function loadEditorMagazines() {
    loadingMags.value = true
    try {
        magazines.value = await magazineService.findAllEditor()
    } catch (e) {
        notify(errorMsg(e), 'error')
    } finally {
        loadingMags.value = false
    }
}

async function applyPermissions(mag: AdminAndEditorResponse) {
    const payload: UpdatePermissionsRequest = {
        id: mag.id,
        allowSubscription: mag.allowSubscription,
        allowComments: mag.allowComments,
        allowReactions: mag.allowReactions,
    }
    try {
        await magazineService.updatePermissionsMagazine(payload)
        notify('Permisos actualizados', 'success')
    } catch (e) {
        notify(errorMsg(e), 'error')
    }
}

// ── Crear revista ─────────────────────────────────────────────────────────────
const createForm = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)
const creating = ref(false)

const newMagazine = ref<MagazineCreateRequest>({
    title: '', description: '',
    allowSubscription: false, allowComments: false, allowReactions: false,
    createDate: new Date(),
})

const formattedDate = computed({
    get: () => newMagazine.value.createDate instanceof Date
        ? newMagazine.value.createDate.toISOString().split('T')[0]
        : newMagazine.value.createDate,
    set: (val: string) => { newMagazine.value.createDate = new Date(val) },
})

const required = (v: string) => !!v?.trim() || 'Campo obligatorio'

async function handleCreate() {
    const { valid } = await createForm.value!.validate()
    if (!valid) return
    creating.value = true
    try {
        await magazineService.createMagazine({ ...newMagazine.value })
        notify('Revista creada correctamente', 'success')
        Object.assign(newMagazine.value, {
            title: '', description: '',
            allowSubscription: false, allowComments: false, allowReactions: false,
            createDate: new Date(),
        })
        tab.value = 'manage'
        await loadEditorMagazines()
    } catch (e) {
        notify(errorMsg(e), 'error')
    } finally {
        creating.value = false
    }
}

// ── Diálogo: categorías y tags ────────────────────────────────────────────────
const manageDialog = ref(false)
const selectedMagazine = ref<AdminAndEditorResponse | null>(null)
const assignedCategories = ref<CategoryResponse[]>([])
const assignedTags = ref<TagResponse[]>([])
const loadingDialog = ref(false)
const availableCategories = ref<CategoryMagazine[]>([])
const selectedCategoryToAdd = ref<number | null>(null)
const addingCategory = ref(false)
const newTag = ref('')
const addingTag = ref(false)

async function openManageDialog(mag: AdminAndEditorResponse) {
    selectedMagazine.value = mag
    manageDialog.value = true
    loadingDialog.value = true
    try {
        await Promise.all([
            loadAssignedCategories(mag.id),
            loadAssignedTags(mag.id),
            loadAvailableCategories(),
        ])
    } finally {
        loadingDialog.value = false
    }
}

async function loadAvailableCategories() {
    try {
        availableCategories.value = await categoryMagazineService.findAllTypeCategoryMagazine()
    } catch (e) { notify(errorMsg(e), 'error') }
}

async function loadAssignedCategories(idMagazine: number) {
    try {
        assignedCategories.value = await categoryService.findByMagazineId(idMagazine)
    } catch { assignedCategories.value = [] }
}

async function loadAssignedTags(idMagazine: number) {
    try {
        assignedTags.value = await tagService.findByMagazineId(idMagazine)
    } catch { assignedTags.value = [] }
}

async function addCategory() {
    if (!selectedCategoryToAdd.value || !selectedMagazine.value) return
    addingCategory.value = true
    try {
        await categoryService.createMagazineCategory({
            idMagazine: selectedMagazine.value.id,
            idCategoryMagazine: selectedCategoryToAdd.value,
        })
        selectedCategoryToAdd.value = null
        notify('Categoría agregada', 'success')
        await loadAssignedCategories(selectedMagazine.value.id)
    } catch (e) {
        notify(errorMsg(e), 'error')
    } finally {
        addingCategory.value = false
    }
}

async function removeCategory(idCategory: number) {
    try {
        await categoryService.deleteMagazineCategory(idCategory)
        if (selectedMagazine.value) await loadAssignedCategories(selectedMagazine.value.id)
        notify('Categoría eliminada', 'success')
    } catch (e) { notify(errorMsg(e), 'error') }
}

async function addTag() {
    if (!newTag.value.trim() || !selectedMagazine.value) return
    addingTag.value = true
    try {
        await tagService.createMagazineTag({ idMagazine: selectedMagazine.value.id, detail: newTag.value.trim() })
        newTag.value = ''
        notify('Tag agregado', 'success')
        await loadAssignedTags(selectedMagazine.value.id)
    } catch (e) {
        notify(errorMsg(e), 'error')
    } finally {
        addingTag.value = false
    }
}

async function removeTag(idTag: number) {
    try {
        await tagService.deleteTag(idTag)
        if (selectedMagazine.value) await loadAssignedTags(selectedMagazine.value.id)
        notify('Tag eliminado', 'success')
    } catch (e) { notify(errorMsg(e), 'error') }
}

function closeManageDialog() {
    manageDialog.value = false
    selectedMagazine.value = null
    assignedCategories.value = []
    assignedTags.value = []
    selectedCategoryToAdd.value = null
    newTag.value = ''
}

onMounted(loadEditorMagazines)
</script>

<template>
    <v-app>

        <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3500" location="top" rounded="pill">
            <v-icon :icon="snackbar.icon" class="mr-2" />{{ snackbar.message }}
            <template #actions>
                <v-btn icon="mdi-close" variant="text" @click="snackbar.show = false" />
            </template>
        </v-snackbar>

        <v-container class="py-6">

            <!-- Tabs -->
            <v-tabs v-model="tab" class="mb-5 tabs-bar" color="#e8c97a">
                <v-tab value="manage" prepend-icon="mdi-newspaper-variant-multiple">Gestionar revistas</v-tab>
                <v-tab value="create" prepend-icon="mdi-plus-circle-outline">Crear revista</v-tab>
            </v-tabs>

            <v-window v-model="tab">

                <!-- ══ TAB 1: Listado ══ -->
                <v-window-item value="manage">

                    <div v-if="loadingMags" class="text-center py-12">
                        <v-progress-circular indeterminate color="#e8c97a" size="48" />
                    </div>

                    <div v-else-if="magazines.length === 0" class="text-center py-12">
                        <v-icon icon="mdi-newspaper-remove" size="52" color="#c8b8a2" class="mb-3 d-block" />
                        <span class="text-body-2" style="color:#c8b8a2;">No hay revistas disponibles.</span>
                    </div>

                    <v-row v-else>
                        <v-col v-for="mag in magazines" :key="mag.id" cols="12" sm="6" md="4">
                            <v-card rounded="xl" class="mag-card h-100 d-flex flex-column" elevation="0">

                                <!-- Título + chip -->
                                <v-card-title class="d-flex align-center gap-2 pt-4 px-4 pb-1">
                                    <span class="text-body-1 font-weight-bold text-truncate" style="color:#f5f0e8;">
                                        {{ mag.titles }}
                                    </span>
                                    <v-spacer />
                                    <v-chip v-if="mag.activeMagazine" size="x-small" variant="flat" class="chip-active">
                                        Activo
                                    </v-chip>
                                </v-card-title>

                                <!-- Descripción + switches -->
                                <v-card-text class="pb-0 px-4 flex-grow-1">
                                    <p class="text-body-2 mb-4" style="color:#c8b8a2; line-height:1.5;">
                                        {{ mag.description }}
                                    </p>

                                    <v-divider class="mb-3" style="border-color:#3d2f20;" />

                                    <p class="text-caption mb-2" style="color:#c8b8a2;">Permisos</p>
                                    <v-switch v-model="mag.allowSubscription" label="Suscripción" color="#4caf50"
                                        density="compact" hide-details class="mb-1" />
                                    <v-switch v-model="mag.allowComments" label="Comentarios" color="#4caf50"
                                        density="compact" hide-details class="mb-1" />
                                    <v-switch v-model="mag.allowReactions" label="Reacciones" color="#4caf50"
                                        density="compact" hide-details />
                                </v-card-text>

                                <!-- Acciones en dos filas -->
                                <div class="pa-4 pt-3 d-flex flex-column gap-2">

                                    <!-- Fila 1: Categorías/Tags + Anuncios -->
                                    <div class="d-flex gap-2">
                                        <v-btn variant="outlined" prepend-icon="mdi-tag-multiple-outline" rounded="lg"
                                            size="small" class="btn-secondary flex-grow-1"
                                            @click="openManageDialog(mag)">
                                            Cat / Tags
                                        </v-btn>
                                        <v-btn variant="outlined" prepend-icon="mdi-bullhorn-outline" rounded="lg"
                                            size="small" class="btn-ads flex-grow-1" @click="goToAds(mag.id)">
                                            Anuncios
                                        </v-btn>
                                    </div>

                                    <!-- Fila 2: Ediciones + Actualizar permisos -->
                                    <div class="d-flex gap-2">
                                        <v-btn variant="outlined" prepend-icon="mdi-file-document-multiple-outline"
                                            rounded="lg" size="small" class="btn-editions flex-grow-1"
                                            @click="goToEditions(mag.id)">
                                            Ediciones
                                        </v-btn>
                                        <v-btn variant="flat" prepend-icon="mdi-shield-edit-outline" rounded="lg"
                                            size="small" class="btn-primary flex-grow-1" @click="applyPermissions(mag)">
                                            Permisos
                                        </v-btn>
                                    </div>

                                </div>

                            </v-card>
                        </v-col>
                    </v-row>
                </v-window-item>

                <!-- ══ TAB 2: Crear ══ -->
                <v-window-item value="create">
                    <v-row justify="center" class="mt-2">
                        <v-col cols="12" sm="9" md="6">
                            <v-card rounded="xl" class="mag-card" elevation="0">
                                <v-card-text class="pa-6">

                                    <p class="text-h6 font-weight-bold mb-5" style="color:#f5f0e8;">Nueva revista</p>

                                    <v-form ref="createForm" @submit.prevent="handleCreate">
                                        <v-text-field v-model="newMagazine.title" label="Título *"
                                            prepend-inner-icon="mdi-format-title" variant="outlined" rounded="lg"
                                            base-color="#c8b8a2" color="#e8c97a" bg-color="#1a1008" :rules="[required]"
                                            hide-details="auto" class="mb-3" />
                                        <v-textarea v-model="newMagazine.description" label="Descripción *"
                                            prepend-inner-icon="mdi-text-outline" variant="outlined" rounded="lg"
                                            base-color="#c8b8a2" color="#e8c97a" bg-color="#1a1008" :rules="[required]"
                                            rows="3" auto-grow hide-details="auto" class="mb-3" />
                                        <v-text-field v-model="formattedDate" label="Fecha de creación"
                                            prepend-inner-icon="mdi-calendar-outline" variant="outlined" rounded="lg"
                                            base-color="#c8b8a2" color="#e8c97a" bg-color="#1a1008" type="date"
                                            hide-details="auto" class="mb-4" />

                                        <p class="text-caption mb-2" style="color:#c8b8a2;">Permisos iniciales</p>
                                        <v-switch v-model="newMagazine.allowSubscription" label="Suscripción"
                                            color="#4caf50" density="compact" hide-details class="mb-1" />
                                        <v-switch v-model="newMagazine.allowComments" label="Comentarios"
                                            color="#4caf50" density="compact" hide-details class="mb-1" />
                                        <v-switch v-model="newMagazine.allowReactions" label="Reacciones"
                                            color="#4caf50" density="compact" hide-details class="mb-5" />

                                        <v-btn type="submit" block rounded="lg" size="large" :loading="creating"
                                            prepend-icon="mdi-plus" class="btn-primary">
                                            Crear revista
                                        </v-btn>
                                    </v-form>
                                </v-card-text>
                            </v-card>
                        </v-col>
                    </v-row>
                </v-window-item>

            </v-window>
        </v-container>

        <!-- ══ Diálogo: categorías y tags ══ -->
        <v-dialog v-model="manageDialog" max-width="680" scrollable>
            <v-card rounded="xl" class="dialog-card">

                <v-card-title class="d-flex align-center pa-5 pb-3" style="color:#f5f0e8;">
                    <v-icon icon="mdi-tag-multiple-outline" color="#e8c97a" class="mr-2" />
                    {{ selectedMagazine?.titles }}
                    <v-spacer />
                    <v-btn icon="mdi-close" variant="text" @click="closeManageDialog" />
                </v-card-title>

                <v-divider color="#3d2f20" />

                <v-card-text class="pa-5">

                    <div v-if="loadingDialog" class="text-center py-8">
                        <v-progress-circular indeterminate color="#e8c97a" />
                    </div>

                    <v-row v-else>

                        <!-- Categorías -->
                        <v-col cols="12" md="6">
                            <p class="text-subtitle-2 font-weight-bold mb-3" style="color:#e8c97a;">
                                <v-icon icon="mdi-bookshelf" size="16" class="mr-1" /> Categorías
                            </p>

                            <div class="d-flex gap-2 mb-3 align-center">
                                <v-select v-model="selectedCategoryToAdd" :items="availableCategories" item-title="name"
                                    item-value="id" label="Seleccionar" variant="outlined" rounded="lg"
                                    density="compact" base-color="#c8b8a2" color="#e8c97a" bg-color="#1a1008"
                                    hide-details clearable class="flex-grow-1" />
                                <v-btn icon="mdi-plus" rounded="lg" class="btn-green" :loading="addingCategory"
                                    :disabled="!selectedCategoryToAdd" @click="addCategory" />
                            </div>

                            <p v-if="assignedCategories.length === 0" class="text-caption text-center py-3"
                                style="color:#c8b8a2;">
                                Sin categorías asignadas
                            </p>
                            <v-list v-else density="compact" class="pa-0 bg-transparent">
                                <v-list-item v-for="cat in assignedCategories" :key="cat.id" rounded="lg"
                                    class="mb-1 list-item">
                                    <template #prepend>
                                        <v-icon icon="mdi-bookmark-outline" size="16" color="#e8c97a" />
                                    </template>
                                    <v-list-item-title class="text-body-2" style="color:#f5f0e8;">
                                        {{ cat.magazineCategoryName }}
                                    </v-list-item-title>
                                    <template #append>
                                        <v-btn icon="mdi-delete-outline" size="x-small" variant="text" color="error"
                                            @click="removeCategory(cat.id)" />
                                    </template>
                                </v-list-item>
                            </v-list>
                        </v-col>

                        <v-divider vertical class="d-none d-md-block" color="#3d2f20" />

                        <!-- Tags -->
                        <v-col cols="12" md="6">
                            <p class="text-subtitle-2 font-weight-bold mb-3" style="color:#e8c97a;">
                                <v-icon icon="mdi-label-outline" size="16" class="mr-1" /> Tags
                            </p>

                            <div class="d-flex gap-2 mb-3 align-center">
                                <v-text-field v-model="newTag" label="Nuevo tag" variant="outlined" rounded="lg"
                                    density="compact" base-color="#c8b8a2" color="#e8c97a" bg-color="#1a1008"
                                    hide-details class="flex-grow-1" @keyup.enter="addTag" />
                                <v-btn icon="mdi-plus" rounded="lg" class="btn-green" :loading="addingTag"
                                    :disabled="!newTag.trim()" @click="addTag" />
                            </div>

                            <p v-if="assignedTags.length === 0" class="text-caption text-center py-3"
                                style="color:#c8b8a2;">
                                Sin tags asignados
                            </p>
                            <v-list v-else density="compact" class="pa-0 bg-transparent">
                                <v-list-item v-for="tag in assignedTags" :key="tag.id" rounded="lg"
                                    class="mb-1 list-item">
                                    <template #prepend>
                                        <v-icon icon="mdi-pound" size="16" color="#e8c97a" />
                                    </template>
                                    <v-list-item-title class="text-body-2" style="color:#f5f0e8;">
                                        {{ tag.tagName }}
                                    </v-list-item-title>
                                    <template #append>
                                        <v-btn icon="mdi-delete-outline" size="x-small" variant="text" color="error"
                                            @click="removeTag(tag.id)" />
                                    </template>
                                </v-list-item>
                            </v-list>
                        </v-col>

                    </v-row>
                </v-card-text>
            </v-card>
        </v-dialog>

    </v-app>
</template>

<style scoped>
.mag-card {
    background-color: #2c1f0f !important;
}

.dialog-card {
    background-color: #2c1f0f !important;
}

.tabs-bar {
    background-color: #2c1f0f;
    border-radius: 12px;
}

/* Botones de acción en las cards */
.btn-primary {
    background-color: #b5451b !important;
    color: #f5f0e8 !important;
    font-weight: 600;
}

.btn-secondary {
    border-color: #c8b8a2 !important;
    color: #c8b8a2 !important;
}

.btn-ads {
    border-color: #e8c97a !important;
    color: #e8c97a !important;
}

.btn-editions {
    border-color: #7ab8e8 !important;
    color: #7ab8e8 !important;
}

.btn-green {
    background-color: #4caf50 !important;
    color: #fff !important;
}

.chip-active {
    background-color: #4caf50 !important;
    color: #fff !important;
}

.list-item {
    background: rgba(232, 201, 122, 0.07) !important;
    border-left: 2px solid #e8c97a;
}
</style>