import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import AppLayout from '@/layouts/AppLayout.vue';
import LoginPage from '@/pages/LoginPage.vue';
import DashboardPage from '@/pages/dashboard/DashboardPage.vue';
import GraphPage from '@/pages/graph/GraphPage.vue';
import EmailsPage from '@/pages/items/ItemsPage.vue';
import SearchPage from '@/pages/statistics/StatisticsPage.vue';
import DirectoryPage from '@/pages/subscriptions/SubscriptionsPage.vue';
import SettingsPage from '@/pages/settings/SettingsPage.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginPage,
      meta: {
        guestOnly: true
      }
    },
    {
      path: '/graph',
      redirect: '/graph-full'
    },
    {
      path: '/graph-full',
      name: 'graph-full',
      component: GraphPage,
      meta: {
        requiresAuth: true
      }
    },
    {
      path: '/',
      component: AppLayout,
      meta: {
        requiresAuth: true
      },
      children: [
        {
          path: '',
          redirect: '/dashboard'
        },
        {
          path: '/dashboard',
          name: 'dashboard',
          component: DashboardPage
        },
        {
          path: '/emails',
          name: 'emails',
          component: EmailsPage
        },
        {
          path: '/directory',
          name: 'directory',
          component: DirectoryPage
        },
        {
          path: '/search',
          name: 'search',
          component: SearchPage
        },
        {
          path: '/settings',
          name: 'settings',
          component: SettingsPage
        }
      ]
    }
  ]
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.token) {
    return { name: 'login' };
  }

  if (to.meta.guestOnly && authStore.token) {
    return { name: 'dashboard' };
  }

  if (authStore.token && !authStore.user) {
    try {
      await authStore.fetchProfile();
    } catch {
      authStore.logout();
      return { name: 'login' };
    }
  }

  return true;
});

export default router;
