<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { authService } from '@/services/auth/auth.service'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

type Role = 1 | 2 | 3 | 4

const role = computed<Role | null>(() =>
  authStore.idRole ? Number(authStore.idRole) as Role : null
)

const isLoggedIn = computed(() => authStore.isLoggedIn)
const username = computed(() => authStore.username ?? '')

const drawer = ref(false)
const userMenu = ref(false)

const toggling2FA = ref(false)

async function handleToggle2FA() {
  toggling2FA.value = true
  try {
    await authService.toggleVerification()
    notify('Verificación en 2 pasos actualizada.', 'success')
  } catch (e: unknown) {
    notify(errorMessage(e), 'error')
  } finally {
    toggling2FA.value = false
    userMenu.value = false
  }
}

function handleLogout() {
  authStore.clearSession()
  userMenu.value = false
  router.push({ name: 'login' })
}

const snackbar = ref({
  show: false,
  message: '',
  color: 'success',
  icon: 'mdi-check-circle-outline'
})

const notifyMap = {
  success: { color: 'success', icon: 'mdi-check-circle-outline' },
  error: { color: 'error', icon: 'mdi-alert-circle-outline' },
  warning: { color: 'warning', icon: 'mdi-alert-outline' },
} as const

function notify(message: string, type: keyof typeof notifyMap = 'success') {
  Object.assign(snackbar.value, { show: true, message, ...notifyMap[type] })
}

function errorMessage(e: unknown): string {
  if (typeof e === 'string') return e
  if (e && typeof e === 'object' && 'message' in e)
    return (e as { message: string }).message
  return 'Error inesperado.'
}

interface NavItem {
  title: string
  icon: string
  to: string
  roles?: Role[]
}

const allNavItems: NavItem[] = [

  // Público
  { title: 'Inicio', icon: 'mdi-home', to: '/' },

  // Todos los autenticados
  { title: 'Mi perfil', icon: 'mdi-account-circle-outline', to: '/edit/user', roles: [1, 2, 3, 4] },
  { title: 'Suscripciones', icon: 'mdi-newspaper-variant', to: '/magazines/subscription', roles: [3] },

  // EDITOR (2) y ADMIN (1)
  { title: 'Mis Revistas', icon: 'mdi-book-multiple', to: '/magazines/editor', roles: [2] },
  { title: 'Reportes', icon: 'mdi-chart-bar', to: '/reports/editor', roles: [2] },

  // ADMIN (1)
  { title: 'Crear Perfiles', icon: 'mdi-account-plus-outline', to: '/create/user', roles: [1] },
  { title: 'Usuarios', icon: 'mdi-account-group-outline', to: '/list/users', roles: [1] },
  { title: 'Control Revista', icon: 'mdi-view-dashboard-outline', to: '/magazines/admin', roles: [1] },
  { title: 'Sugerencias Precio', icon: 'mdi-tag-multiple-outline', to: '/suggested', roles: [1] },
  { title: 'Control Anuncios', icon: 'mdi-bullhorn-outline', to: '/ad/admin', roles: [1] },
  { title: 'Reportes', icon: 'mdi-chart-bar', to: '/reports/admin', roles: [1] },

  // ADVERTISER (4)
  { title: 'Mis anuncios', icon: 'mdi-bullhorn-outline', to: '/ad/control', roles: [4] },
]

const navItems = computed(() => {
  return allNavItems.filter(item => {

    // Público
    if (!item.roles) return true

    // Invitado
    if (!isLoggedIn.value)
      return item.roles.length === 0

    // Autenticado
    return item.roles.includes(role.value as Role)
  })
})

const roleConfig: Record<Role, { text: string; color: string }> = {
  1: { text: 'Administrador', color: 'error' },
  2: { text: 'Editor', color: 'warning' },
  3: { text: 'Suscriptor', color: 'success' },
  4: { text: 'Anunciante', color: 'info' },
}

const roleLabel = computed(() => {
  if (!role.value) return { text: 'Invitado', color: 'grey' }
  return roleConfig[role.value]
})
</script>

<template>
  <!-- ── Snackbar ── -->
  <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3500" location="top" rounded="pill">
    <v-icon :icon="snackbar.icon" class="mr-2" />
    {{ snackbar.message }}
    <template #actions>
      <v-btn icon="mdi-close" variant="text" @click="snackbar.show = false" />
    </template>
  </v-snackbar>

  <!-- ── App bar ── -->
  <v-app-bar height="80" color="teal-darken-4"
    image="https://getsynccom.wpenginepowered.com/wp-content/uploads/2023/08/aspera-vs-signiant-vs-resilio-2.jpg">
    <!-- Botón hamburguesa -->
    <template #prepend>
      <v-btn @click="drawer = !drawer">
        <v-icon>mdi-view-headline</v-icon>
      </v-btn>
    </template>

    <v-app-bar-title>Revista Xela</v-app-bar-title>

    <v-spacer />

    <!-- ── Botón derecho: invitado ── -->
    <template v-if="!isLoggedIn">
      <v-btn variant="tonal" rounded="lg" class="mr-3" to="/login">
        <v-icon icon="mdi-login" class="mr-1" /> Entrar
      </v-btn>
    </template>

    <!-- ── Botón derecho: autenticado ── -->
    <template v-else>
      <v-menu v-model="userMenu" :close-on-content-click="false" location="bottom end">
        <template #activator="{ props }">
          <v-btn v-bind="props" variant="tonal" rounded="lg" class="mr-3">
            <v-icon icon="mdi-account-circle-outline" class="mr-1" />
            {{ username }}
            <v-icon icon="mdi-chevron-down" class="ml-1" size="18" />
          </v-btn>
        </template>

        <!-- Dropdown -->
        <v-card min-width="240" rounded="lg" class="user-menu-card mt-2" elevation="8">

          <!-- Cabecera del menú -->
          <v-list-item :subtitle="roleLabel.text" class="pt-3 pb-2">
            <template #prepend>
              <v-avatar color="teal-darken-4" size="40">
                <v-icon icon="mdi-account" color="white" />
              </v-avatar>
            </template>
            <template #title>
              <span class="font-weight-bold">{{ username }}</span>
            </template>
            <template #subtitle>
              <v-chip :color="roleLabel.color" size="x-small" variant="flat" class="mt-1">
                {{ roleLabel.text }}
              </v-chip>
            </template>
          </v-list-item>

          <v-divider class="my-1" />

          <!-- Toggle 2FA -->
          <v-list-item prepend-icon="mdi-shield-key-outline" rounded="lg" class="mx-1" :disabled="toggling2FA"
            @click="handleToggle2FA">
            <v-list-item-title class="text-body-2">
              {{ toggling2FA ? 'Actualizando...' : 'Verificación en 2 pasos' }}
            </v-list-item-title>
            <template #append>
              <v-progress-circular v-if="toggling2FA" indeterminate size="16" width="2" />
              <v-icon v-else icon="mdi-chevron-right" size="18" />
            </template>
          </v-list-item>

          <v-divider class="my-1" />

          <!-- Cerrar sesión -->
          <v-list-item prepend-icon="mdi-logout" rounded="lg" class="mx-1 mb-1 text-error" @click="handleLogout">
            <v-list-item-title class="text-body-2 text-error font-weight-medium">
              Cerrar sesión
            </v-list-item-title>
          </v-list-item>

        </v-card>
      </v-menu>
    </template>
  </v-app-bar>

  <!-- ── Navigation drawer ── -->
  <v-navigation-drawer v-model="drawer" temporary width="300">

    <!-- Header del drawer -->
    <div class="drawer-header pa-4 d-flex align-center gap-3">
      <v-icon icon="mdi-book-open-page-variant" color="#e8c97a" size="32" />
      <div>
        <div class="font-weight-bold" style="color: #e8c97a; letter-spacing: 1px;">KIOSCO</div>
        <div class="text-caption text-medium-emphasis">Tu mundo de revistas</div>
      </div>
    </div>

    <v-divider />

    <!-- Items de navegación -->
    <v-list nav class="pa-2">
      <v-list-item v-for="item in navItems" :key="item.to" :to="item.to" :title="item.title" :prepend-icon="item.icon"
        rounded="lg" class="mb-1" />
    </v-list>

    <!-- Sección inferior si está autenticado -->
    <template v-if="isLoggedIn" #append>
      <v-divider />
      <div class="pa-3">
        <v-btn block variant="tonal" color="error" rounded="lg" prepend-icon="mdi-logout" @click="handleLogout">
          Cerrar sesión
        </v-btn>
      </div>
    </template>

  </v-navigation-drawer>
</template>

<style scoped>
.drawer-header {
  background: #1a1008;
}

.user-menu-card {
  background: #2c1f0f !important;
}
</style>