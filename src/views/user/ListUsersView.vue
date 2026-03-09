<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { userService } from '@/services/user/user.service'
import { authService } from '@/services/auth/auth.service'
import type { UserFindResponse } from '@/types/user/UserFindResponse'

// ── Estado ─────────────────────────────────────────────────────────────────
const users = ref<UserFindResponse[]>([])
const loading = ref(false)
const search = ref('')

// ── Diálogo de confirmación ────────────────────────────────────────────────
const dialog = ref(false)
const selectedUser = ref<UserFindResponse | null>(null)
const sending = ref(false)
const sent = ref<Set<number>>(new Set())

// ── Snackbar ───────────────────────────────────────────────────────────────
const snackbar = ref({ show: false, message: '', color: '' })
function notify(message: string, color: 'success' | 'error') {
    snackbar.value = { show: true, message, color }
}

// ── Carga ──────────────────────────────────────────────────────────────────
async function loadUsers() {
    loading.value = true
    try {
        users.value = await userService.findAllUsers()
    } catch {
        notify('Error al cargar los usuarios', 'error')
    } finally {
        loading.value = false
    }
}

onMounted(loadUsers)

// ── Filtro ─────────────────────────────────────────────────────────────────
const filtered = computed(() => {
    const q = search.value.toLowerCase()
    if (!q) return users.value
    return users.value.filter(u =>
        `${u.names} ${u.lastNames}`.toLowerCase().includes(q) ||
        u.userTypeName.toLowerCase().includes(q) ||
        u.municipalityName.toLowerCase().includes(q)
    )
})

// ── Acciones ───────────────────────────────────────────────────────────────
function openConfirm(user: UserFindResponse) {
    selectedUser.value = user
    dialog.value = true
}

async function confirmSend() {
    if (!selectedUser.value) return
    sending.value = true
    try {
        await authService.sendLoginToken(selectedUser.value.id)
        sent.value.add(selectedUser.value.id)
        notify(`Token enviado a ${selectedUser.value.names} ${selectedUser.value.lastNames}`, 'success')
        dialog.value = false
    } catch (e: unknown) {
        notify(errorMessage(e), 'error')
    } finally {
        sending.value = false
    }
}

function errorMessage(e: unknown): string {
    if (typeof e === 'string') return e
    if (e && typeof e === 'object' && 'message' in e) return (e as { message: string }).message
    return 'Ocurrió un error. Inténtalo de nuevo.'
}

// ── Helpers ────────────────────────────────────────────────────────────────
function avatarLetter(u: UserFindResponse) {
    return u.names.charAt(0).toUpperCase()
}
function statusColor(status: string) {
    const s = status.toLowerCase()
    if (s.includes('activ')) return '#4caf50'
    if (s.includes('inactiv') || s.includes('bloq')) return '#b5451b'
    return '#c8b8a2'
}
function typeColor(type: string) {
    const t = type.toLowerCase()
    if (t.includes('admin')) return '#e8c97a'
    if (t.includes('editor')) return '#7ab8e8'
    return '#c8b8a2'
}
</script>

<template>
    <v-app style="background:#1a1008;">

        <!-- ── Snackbar ── -->
        <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3500" location="top" rounded="pill">
            {{ snackbar.message }}
            <template #actions>
                <v-btn icon="mdi-close" variant="text" @click="snackbar.show = false" />
            </template>
        </v-snackbar>

        <!-- ══════════════════════════════════════════════════════════
             DIÁLOGO DE CONFIRMACIÓN
        ══════════════════════════════════════════════════════════ -->
        <v-dialog v-model="dialog" max-width="440" persistent>
            <v-card rounded="xl" elevation="0" style="background:#2a1e12; border:1px solid #5a3e28;">
                <!-- Ícono central -->
                <div class="d-flex justify-center pt-7 pb-2">
                    <div style="
                        width:64px; height:64px; border-radius:50%;
                        background:#3d2f20; border:2px solid #e8c97a;
                        display:flex; align-items:center; justify-content:center;">
                        <v-icon icon="mdi-email-fast-outline" color="#e8c97a" size="30" />
                    </div>
                </div>

                <v-card-title class="text-center pb-1" style="color:#f5f0e8; font-size:1.1rem; font-weight:700;">
                    Enviar token de acceso
                </v-card-title>

                <v-card-text class="text-center pb-2" style="color:#c8b8a2; font-size:0.9rem;">
                    Se enviará el token de inicio de primera sesión a:
                    <br />
                    <span class="font-weight-bold mt-1 d-block" style="color:#e8c97a; font-size:1rem;">
                        {{ selectedUser?.names }} {{ selectedUser?.lastNames }}
                    </span>
                    <span style="font-size:0.8rem;">{{ selectedUser?.userTypeName }} · {{ selectedUser?.municipalityName
                        }}</span>
                    <br /><br />
                    <span style="color:#c8b8a2; font-size:0.82rem;">
                        <v-icon icon="mdi-information-outline" size="14" class="mr-1" />
                        Esta acción no se puede deshacer.
                    </span>
                </v-card-text>

                <v-card-actions class="px-6 pb-6 gap-3 d-flex">
                    <v-btn variant="outlined" rounded="lg" class="flex-grow-1"
                        style="border-color:#5a3e28 !important; color:#c8b8a2 !important;" :disabled="sending"
                        @click="dialog = false">
                        Cancelar
                    </v-btn>
                    <v-btn variant="flat" rounded="lg" class="flex-grow-1 btn-primary" :loading="sending"
                        prepend-icon="mdi-send-outline" @click="confirmSend">
                        Enviar token
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- ══════════════════════════════════════════════════════════
             CONTENIDO PRINCIPAL
        ══════════════════════════════════════════════════════════ -->
        <v-container class="py-6" style="background:#1a1008; min-height:100vh;">

            <!-- Encabezado -->
            <div class="mb-6">
                <p class="text-h5 font-weight-bold mb-1" style="color:#f5f0e8;">
                    <v-icon icon="mdi-account-group-outline" color="#e8c97a" class="mr-2" />
                    Gestión de Usuarios
                </p>
                <p class="text-body-2" style="color:#c8b8a2;">
                    Administra los usuarios registrados y envía tokens de acceso inicial
                </p>
            </div>

            <!-- Barra de búsqueda + contador -->
            <v-card rounded="xl" elevation="0" class="filter-card mb-5 pa-4">
                <v-row dense align="center">
                    <v-col cols="12" sm="8">
                        <v-text-field v-model="search" placeholder="Buscar por nombre, tipo o municipio..."
                            prepend-inner-icon="mdi-magnify" variant="outlined" density="compact" class="report-input"
                            clearable hide-details />
                    </v-col>
                    <v-col cols="12" sm="4" class="d-flex align-center justify-end gap-2">
                        <v-chip size="small" variant="flat" style="background:#3d2f20; color:#e8c97a;">
                            <v-icon icon="mdi-account-multiple-outline" size="13" class="mr-1" />
                            {{ filtered.length }} usuarios
                        </v-chip>
                        <v-btn variant="outlined" size="small" rounded="lg" icon="mdi-refresh"
                            style="border-color:#5a3e28 !important; color:#c8b8a2 !important;" :loading="loading"
                            @click="loadUsers" />
                    </v-col>
                </v-row>
            </v-card>

            <!-- Loading -->
            <div v-if="loading" class="text-center py-16">
                <v-progress-circular indeterminate color="#e8c97a" size="48" />
                <p class="text-body-2 mt-4" style="color:#c8b8a2;">Cargando usuarios...</p>
            </div>

            <!-- Lista vacía -->
            <div v-else-if="filtered.length === 0" class="text-center py-16">
                <v-icon icon="mdi-account-search-outline" size="52" color="#5a3e28" class="mb-3 d-block" />
                <p style="color:#c8b8a2;">No se encontraron usuarios</p>
            </div>

            <!-- Lista de usuarios -->
            <v-row v-else>
                <v-col v-for="user in filtered" :key="user.id" cols="12" sm="6" lg="4">
                    <v-card rounded="xl" elevation="0" class="user-card pa-4">

                        <!-- Fila superior: avatar + datos -->
                        <div class="d-flex align-start gap-3 mb-3">
                            <!-- Avatar / foto -->
                            <v-avatar size="52" style="flex-shrink:0; border:2px solid #5a3e28;">
                                <v-img v-if="user.photography" :src="user.photography" cover />
                                <span v-else class="avatar-letter">{{ avatarLetter(user) }}</span>
                            </v-avatar>

                            <!-- Nombre y chips -->
                            <div class="flex-grow-1 min-width-0">
                                <p class="text-body-1 font-weight-bold mb-1 text-truncate" style="color:#f5f0e8;">
                                    {{ user.names }} {{ user.lastNames }}
                                </p>
                                <div class="d-flex flex-wrap gap-1">
                                    <v-chip size="x-small" variant="flat"
                                        :style="`background:${typeColor(user.userTypeName)}22; color:${typeColor(user.userTypeName)}; border:1px solid ${typeColor(user.userTypeName)}44;`">
                                        {{ user.userTypeName }}
                                    </v-chip>
                                    <v-chip size="x-small" variant="flat"
                                        :style="`background:${statusColor(user.userStatusName)}22; color:${statusColor(user.userStatusName)}; border:1px solid ${statusColor(user.userStatusName)}44;`">
                                        <v-icon
                                            :icon="user.userStatusName.toLowerCase().includes('activ') ? 'mdi-circle' : 'mdi-circle-outline'"
                                            size="8" class="mr-1" />
                                        {{ user.userStatusName }}
                                    </v-chip>
                                </div>
                            </div>
                        </div>

                        <!-- Datos secundarios -->
                        <div class="user-meta mb-4">
                            <div class="meta-row">
                                <v-icon icon="mdi-map-marker-outline" size="14" color="#c8b8a2" />
                                <span>{{ user.municipalityName }}</span>
                            </div>
                            <div class="meta-row">
                                <v-icon icon="mdi-gender-male-female" size="14" color="#c8b8a2" />
                                <span>{{ user.sexTypeName }}</span>
                            </div>
                            <div v-if="user.dateOfBirth" class="meta-row">
                                <v-icon icon="mdi-cake-variant-outline" size="14" color="#c8b8a2" />
                                <span>{{ user.dateOfBirth }}</span>
                            </div>
                        </div>

                        <!-- Botón enviar token -->
                        <v-btn variant="flat" rounded="lg" size="small" block :disabled="sent.has(user.id)"
                            :class="sent.has(user.id) ? 'btn-sent' : 'btn-primary'"
                            :prepend-icon="sent.has(user.id) ? 'mdi-check-circle-outline' : 'mdi-email-fast-outline'"
                            @click="openConfirm(user)">
                            {{ sent.has(user.id) ? 'Token enviado' : 'Enviar token de acceso' }}
                        </v-btn>
                    </v-card>
                </v-col>
            </v-row>

        </v-container>
    </v-app>
</template>

<style scoped>
.filter-card {
    background: #2a1e12 !important;
    border: 1px solid #3d2f20;
}

.user-card {
    background: #2a1e12 !important;
    border: 1px solid #3d2f20;
    transition: border-color .2s;
}

.user-card:hover {
    border-color: #5a3e28 !important;
}

.avatar-letter {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #3d2f20;
    color: #e8c97a;
    font-weight: 700;
    font-size: 1.2rem;
}

.user-meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.meta-row {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #c8b8a2;
    font-size: 0.8rem;
}

.btn-primary {
    background: #e8c97a !important;
    color: #1a1008 !important;
    font-weight: 600;
}

.btn-sent {
    background: #2d3a2d !important;
    color: #4caf50 !important;
    font-weight: 600;
    pointer-events: none;
}

.report-input :deep(.v-field__outline) {
    border-color: #5a3e28 !important;
}

.report-input :deep(label) {
    color: #c8b8a2 !important;
}

.report-input :deep(input) {
    color: #f5f0e8 !important;
}

.report-input :deep(.v-icon) {
    color: #c8b8a2 !important;
}
</style>