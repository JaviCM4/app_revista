import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '@/views/auth/LoginView.vue'
import CreateUserView from '@/views/user/CreateUserView.vue'
import RecoverPasswordView from '@/views/auth/RecoverPasswordView.vue'
import FirstLoginView from '@/views/auth/FirstLoginView.vue'
import EditUserView from '@/views/user/EditUserView.vue'
import BrowseMagazinesView from '@/views/magazine/BrowseMagazinesView.vue'
import EditorMagazinesView from '@/views/magazine/EditorMagazinesView.vue'
import AdminMagazineView from '@/views/magazine/AdminMagazineView.vue'
import SubscriptionMagazineView from '@/views/magazine/SubscriptionMagazineView.vue'
import AdBlockView from '@/views/advertisement/AdBlockView.vue'
import EditionView from '@/views/edition/EditionView.vue'
import AdControlView from '@/views/advertisement/AdControlView.vue'
import SuggestionView from '@/views/suggestion/SuggestionView.vue'
import EditionAdminView from '@/views/edition/EditionAdminView.vue'
import AdAdminView from '@/views/advertisement/AdAdminView.vue'
import CreateSuscriptorView from '@/views/user/CreateSuscriptorView.vue'
import EditorReportsView from '@/views/reports/EditorReportsView.vue'
import AdminReportsView from '@/views/reports/AdminReportsView.vue'
import ListUsersView from '@/views/user/ListUsersView.vue'
import EditionEditorView from '@/views/edition/EditionEditorView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: BrowseMagazinesView,
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/create/user',
      name: 'create-user',
      component: CreateUserView,
    },
    {
      path: '/create/suscriptor',
      name: 'create-suscriptor',
      component: CreateSuscriptorView,
    },
    {
      path: '/recover/password',
      name: 'recover-password',
      component: RecoverPasswordView,
    },
    {
      path: '/first/login',
      name: 'first-login',
      component: FirstLoginView,
    },
    {
      path: '/edit/user',
      name: 'edit-user',
      component: EditUserView,
    },
    {
      path: '/magazines/editor',
      name: 'magazines-editor',
      component: EditorMagazinesView,
    },
    {
      path: '/magazines/admin',
      name: 'magazines-admin',
      component: AdminMagazineView,
    },
    {
      path: '/magazines/subscription',
      name: 'magazines-subscription',
      component: SubscriptionMagazineView,
    },
    {
      path: '/ad/block/:idMagazine',
      name: 'ad-block',
      component: AdBlockView,
      props: true,
    },
    {
      path: '/edition/:idMagazine',
      name: 'edition',
      component: EditionView,
      props: true,
    },
    {
      path: '/ad/control',
      name: 'ad-control',
      component: AdControlView,
    },
    {
      path: '/suggested',
      name: 'suggested',
      component: SuggestionView,
    },
    {
      path: '/ediciones/admin/:idMagazine',
      name: 'edition-admin',
      component: EditionAdminView,
      props: true,
    },
    {
      path: '/ad/admin',
      name: 'ad-admin',
      component: AdAdminView,
    },
    {
      path: '/reports/editor',
      name: 'reports-editor',
      component: EditorReportsView,
    },
    {
      path: '/reports/admin',
      name: 'reports-admin',
      component: AdminReportsView,
    },
    {
      path: '/list/users',
      name: 'list-users',
      component: ListUsersView,
    },
    {
      path: '/edition/editor/:idMagazine',
      name: 'edition-editor',
      component: EditionEditorView,
      props: true,
    },
  ],
})

export default router
