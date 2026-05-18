<template>
  <div class="auth-shell">
    <div class="auth-card glass-panel">
      <div class="auth-aside">
        <div class="badge-soft">Email Identity Graph Platform</div>
        <div class="hero-number">把账号关系整理成图</div>
        <h1 style="font-size: 30px; margin: 0 0 10px">把分散账号资产收回同一张关系图</h1>
        <div class="soft-muted" style="line-height: 1.8; max-width: 460px">
          这个平台不是单纯记账号，而是让主邮箱、注册号码、辅助邮箱、辅助号码和平台标签形成一个可检索、可追踪、可视化的身份关系网络。
        </div>

        <div class="list-stack" style="margin-top: 28px">
          <div class="glass-panel" style="padding: 16px; border-radius: 18px">
            <div style="font-weight: 700">统一入口</div>
            <div class="soft-muted" style="margin-top: 8px">
              注册、密码登录、验证码登录和忘记密码全部走同一套账号链路。
            </div>
          </div>
          <div class="glass-panel" style="padding: 16px; border-radius: 18px">
            <div style="font-weight: 700">图谱视角</div>
            <div class="soft-muted" style="margin-top: 8px">
              登录后可以直接查看哪些邮箱共享号码、哪些平台被同一批账号占用。
            </div>
          </div>
          <div class="glass-panel" style="padding: 16px; border-radius: 18px">
            <div style="font-weight: 700">本地运行与容器部署</div>
            <div class="soft-muted" style="margin-top: 8px">
              开发环境可直接运行 Vite + Nest，生产环境可通过 Docker Compose 和域名访问。
            </div>
          </div>
        </div>
      </div>

      <div class="auth-panel">
        <n-tabs v-model:value="activeTab" animated>
          <n-tab-pane name="login" tab="密码登录">
            <n-form label-placement="top" :model="loginForm">
              <n-form-item label="邮箱">
                <n-input v-model:value="loginForm.email" placeholder="you@example.com" />
              </n-form-item>
              <n-form-item label="密码">
                <n-input
                  v-model:value="loginForm.password"
                  type="password"
                  show-password-on="click"
                />
              </n-form-item>
              <n-button type="primary" block size="large" :loading="loading" @click="handleLogin">
                登录系统
              </n-button>
            </n-form>
          </n-tab-pane>

          <n-tab-pane name="code" tab="验证码登录">
            <n-form label-placement="top" :model="codeLoginForm">
              <n-form-item label="邮箱">
                <n-input v-model:value="codeLoginForm.email" placeholder="you@example.com" />
              </n-form-item>
              <n-form-item label="验证码">
                <n-input-group>
                  <n-input v-model:value="codeLoginForm.code" placeholder="6 位邮箱验证码" />
                  <n-button
                    type="primary"
                    secondary
                    :disabled="loginCountdown > 0"
                    :loading="codeLoading.login"
                    @click="handleSendLoginCode"
                  >
                    {{ loginCountdown > 0 ? `${loginCountdown}s 后重发` : '发送验证码' }}
                  </n-button>
                </n-input-group>
              </n-form-item>
              <n-button
                type="primary"
                block
                size="large"
                :loading="loading"
                @click="handleCodeLogin"
              >
                验证码登录
              </n-button>
            </n-form>
          </n-tab-pane>

          <n-tab-pane name="register" tab="注册">
            <n-form label-placement="top" :model="registerForm">
              <n-form-item label="昵称">
                <n-input v-model:value="registerForm.nickname" placeholder="给这个工作台起一个名字" />
              </n-form-item>
              <n-form-item label="邮箱">
                <n-input v-model:value="registerForm.email" placeholder="you@example.com" />
              </n-form-item>
              <n-form-item label="验证码">
                <n-input-group>
                  <n-input v-model:value="registerForm.code" placeholder="6 位邮箱验证码" />
                  <n-button
                    type="primary"
                    secondary
                    :disabled="registerCountdown > 0"
                    :loading="codeLoading.register"
                    @click="handleSendRegisterCode"
                  >
                    {{ registerCountdown > 0 ? `${registerCountdown}s 后重发` : '发送验证码' }}
                  </n-button>
                </n-input-group>
              </n-form-item>
              <n-form-item label="密码">
                <n-input
                  v-model:value="registerForm.password"
                  type="password"
                  show-password-on="click"
                />
              </n-form-item>
              <n-button
                type="primary"
                block
                size="large"
                :loading="loading"
                @click="handleRegister"
              >
                注册并进入系统
              </n-button>
            </n-form>
          </n-tab-pane>

          <n-tab-pane name="reset" tab="忘记密码">
            <n-form label-placement="top" :model="resetForm">
              <n-form-item label="邮箱">
                <n-input v-model:value="resetForm.email" placeholder="you@example.com" />
              </n-form-item>
              <n-form-item label="验证码">
                <n-input-group>
                  <n-input v-model:value="resetForm.code" placeholder="6 位邮箱验证码" />
                  <n-button
                    type="primary"
                    secondary
                    :disabled="resetCountdown > 0"
                    :loading="codeLoading.reset"
                    @click="handleSendResetCode"
                  >
                    {{ resetCountdown > 0 ? `${resetCountdown}s 后重发` : '发送验证码' }}
                  </n-button>
                </n-input-group>
              </n-form-item>
              <n-form-item label="新密码">
                <n-input
                  v-model:value="resetForm.password"
                  type="password"
                  show-password-on="click"
                />
              </n-form-item>
              <n-button
                type="primary"
                block
                size="large"
                :loading="loading"
                @click="handleResetPassword"
              >
                重置密码
              </n-button>
            </n-form>
          </n-tab-pane>
        </n-tabs>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  NButton,
  NForm,
  NFormItem,
  NInput,
  NInputGroup,
  NTabPane,
  NTabs,
  useMessage
} from 'naive-ui';
import { useAuthStore } from '@/stores/auth';
import { extractErrorMessage } from '@/utils/error';

type AuthTab = 'login' | 'code' | 'register' | 'reset';

const router = useRouter();
const message = useMessage();
const authStore = useAuthStore();

const activeTab = ref<AuthTab>('login');
const loading = ref(false);
const codeLoading = reactive({
  register: false,
  login: false,
  reset: false
});

const registerCountdown = ref(0);
const loginCountdown = ref(0);
const resetCountdown = ref(0);

let registerTimer: ReturnType<typeof setInterval> | null = null;
let loginTimer: ReturnType<typeof setInterval> | null = null;
let resetTimer: ReturnType<typeof setInterval> | null = null;

const loginForm = reactive({
  email: '',
  password: ''
});

const codeLoginForm = reactive({
  email: '',
  code: ''
});

const registerForm = reactive({
  nickname: '',
  email: '',
  code: '',
  password: ''
});

const resetForm = reactive({
  email: '',
  code: '',
  password: ''
});

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizePassword(password: string) {
  return password.trim();
}

function formatSendCodeMessage(messageText: string, debugCode?: string) {
  return debugCode ? `${messageText}（当前开发环境验证码：${debugCode}）` : messageText;
}

function startCountdown(kind: 'register' | 'login' | 'reset', seconds = 60) {
  const target =
    kind === 'register' ? registerCountdown : kind === 'login' ? loginCountdown : resetCountdown;
  const timerRef = kind === 'register' ? 'register' : kind === 'login' ? 'login' : 'reset';
  target.value = seconds;

  const timer = setInterval(() => {
    target.value -= 1;
    if (target.value <= 0) {
      clearInterval(timer);
      if (timerRef === 'register') {
        registerTimer = null;
      } else if (timerRef === 'login') {
        loginTimer = null;
      } else {
        resetTimer = null;
      }
    }
  }, 1000);

  if (kind === 'register') {
    if (registerTimer) {
      clearInterval(registerTimer);
    }
    registerTimer = timer;
  } else if (kind === 'login') {
    if (loginTimer) {
      clearInterval(loginTimer);
    }
    loginTimer = timer;
  } else {
    if (resetTimer) {
      clearInterval(resetTimer);
    }
    resetTimer = timer;
  }
}

async function handleSendRegisterCode() {
  codeLoading.register = true;
  try {
    const response = await authStore.sendRegisterCode(normalizeEmail(registerForm.email));
    startCountdown('register');
    message.success(formatSendCodeMessage(response.message, response.debugCode));
  } catch (error) {
    message.error(extractErrorMessage(error, '发送注册验证码失败'));
  } finally {
    codeLoading.register = false;
  }
}

async function handleSendLoginCode() {
  codeLoading.login = true;
  try {
    const response = await authStore.sendLoginCode(normalizeEmail(codeLoginForm.email));
    startCountdown('login');
    message.success(formatSendCodeMessage(response.message, response.debugCode));
  } catch (error) {
    message.error(extractErrorMessage(error, '发送登录验证码失败'));
  } finally {
    codeLoading.login = false;
  }
}

async function handleSendResetCode() {
  codeLoading.reset = true;
  try {
    const response = await authStore.sendPasswordResetCode(normalizeEmail(resetForm.email));
    startCountdown('reset');
    message.success(formatSendCodeMessage(response.message, response.debugCode));
  } catch (error) {
    message.error(extractErrorMessage(error, '发送重置验证码失败'));
  } finally {
    codeLoading.reset = false;
  }
}

async function handleLogin() {
  loading.value = true;
  try {
    await authStore.login({
      email: normalizeEmail(loginForm.email),
      password: normalizePassword(loginForm.password)
    });
    message.success('登录成功');
    router.push('/dashboard');
  } catch (error) {
    message.error(extractErrorMessage(error, '登录失败，请检查邮箱和密码'));
  } finally {
    loading.value = false;
  }
}

async function handleCodeLogin() {
  loading.value = true;
  try {
    await authStore.loginWithCode({
      email: normalizeEmail(codeLoginForm.email),
      code: codeLoginForm.code.trim()
    });
    message.success('验证码登录成功');
    router.push('/dashboard');
  } catch (error) {
    message.error(extractErrorMessage(error, '验证码登录失败'));
  } finally {
    loading.value = false;
  }
}

async function handleRegister() {
  loading.value = true;
  try {
    await authStore.register({
      nickname: registerForm.nickname.trim(),
      email: normalizeEmail(registerForm.email),
      code: registerForm.code.trim(),
      password: normalizePassword(registerForm.password)
    });
    message.success('注册成功，已自动登录');
    router.push('/dashboard');
  } catch (error) {
    message.error(extractErrorMessage(error, '注册失败，请稍后重试'));
  } finally {
    loading.value = false;
  }
}

async function handleResetPassword() {
  loading.value = true;
  try {
    const response = await authStore.resetPassword({
      email: normalizeEmail(resetForm.email),
      code: resetForm.code.trim(),
      password: normalizePassword(resetForm.password)
    });
    message.success(response.message || '密码已重置');
    activeTab.value = 'login';
    loginForm.email = normalizeEmail(resetForm.email);
    loginForm.password = '';
  } catch (error) {
    message.error(extractErrorMessage(error, '重置密码失败'));
  } finally {
    loading.value = false;
  }
}

onBeforeUnmount(() => {
  if (registerTimer) clearInterval(registerTimer);
  if (loginTimer) clearInterval(loginTimer);
  if (resetTimer) clearInterval(resetTimer);
});
</script>
