<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { setLocale } from './i18n';

const { t, locale } = useI18n();

const siteName = ref('Horizon Cloud');
const tagline = ref('Reliable infrastructure for modern teams.');
const year = new Date().getFullYear();
const out = ref('');
const badge = ref('idle');
const statusText = ref('');
const busy = ref(false);

const badgeLabel = computed(() => {
  if (badge.value === 'running') return t('tools.running');
  if (badge.value === 'ready') return t('tools.ready');
  return t('tools.idle');
});

async function getJson(path) {
  const t0 = performance.now();
  const res = await fetch(path, { cache: 'no-store' });
  const t1 = performance.now();
  const data = await res.json();
  return { ms: Math.round(t1 - t0), status: res.status, data };
}

function show(obj) {
  out.value = JSON.stringify(obj, null, 2);
}

function setBusy(on) {
  busy.value = on;
  badge.value = on ? 'running' : 'ready';
}

async function runIp() {
  setBusy(true);
  try {
    show(await getJson('/api/ip'));
  } catch (e) {
    show({ error: String(e) });
  }
  setBusy(false);
}

async function runPing() {
  setBusy(true);
  try {
    const samples = [];
    for (let i = 0; i < 3; i++) samples.push(await getJson('/api/ping'));
    const rtts = samples.map((s) => s.ms);
    show({
      samples: rtts,
      avg_ms: Math.round(rtts.reduce((a, b) => a + b, 0) / rtts.length),
      min_ms: Math.min(...rtts),
      max_ms: Math.max(...rtts),
      server: samples[samples.length - 1].data,
    });
  } catch (e) {
    show({ error: String(e) });
  }
  setBusy(false);
}

async function runHeaders() {
  setBusy(true);
  try {
    show(await getJson('/api/headers'));
  } catch (e) {
    show({ error: String(e) });
  }
  setBusy(false);
}

async function runAll() {
  setBusy(true);
  try {
    const r = await getJson('/api/all');
    show({ latency_ms: r.ms, ...r.data });
  } catch (e) {
    show({ error: String(e) });
  }
  setBusy(false);
}

function switchLang(next) {
  setLocale(next);
}

onMounted(async () => {
  out.value = t('tools.placeholder');
  statusText.value = t('status.checking');
  try {
    const site = await getJson('/api/site');
    if (site.data?.name) siteName.value = site.data.name;
    if (site.data?.tagline) tagline.value = site.data.tagline;
    document.title = siteName.value;
  } catch (_) {}
  try {
    const r = await getJson('/api/status');
    if (r.data?.status === 'operational') {
      statusText.value = t('status.operational', { time: r.data.time });
    } else {
      statusText.value = t('status.unavailable');
    }
    badge.value = 'ready';
  } catch (_) {
    statusText.value = t('status.unavailable');
  }
});
</script>

<template>
  <header class="site-header">
    <div class="wrap nav">
      <div class="logo">{{ siteName }}</div>
      <nav class="nav-links">
        <a href="#products">{{ t('nav.products') }}</a>
        <a href="#tools">{{ t('nav.diagnostics') }}</a>
        <a href="#status">{{ t('nav.status') }}</a>
        <a href="#contact">{{ t('nav.contact') }}</a>
        <div class="lang-switch" role="group" aria-label="Language">
          <button type="button" :class="{ active: locale === 'en' }" @click="switchLang('en')">
            {{ t('lang.en') }}
          </button>
          <button type="button" :class="{ active: locale === 'zh' }" @click="switchLang('zh')">
            {{ t('lang.zh') }}
          </button>
        </div>
      </nav>
    </div>
  </header>

  <main class="wrap">
    <section class="hero">
      <h1>{{ siteName }}</h1>
      <p>{{ tagline }}</p>
      <div class="cta-row">
        <a class="cta" href="#tools">{{ t('hero.ctaTools') }}</a>
        <a class="cta secondary" href="#status">{{ t('hero.ctaStatus') }}</a>
      </div>
    </section>

    <section id="products" class="grid">
      <article class="card">
        <h3>{{ t('products.edgeTitle') }}</h3>
        <p>{{ t('products.edgeDesc') }}</p>
      </article>
      <article class="card">
        <h3>{{ t('products.apiTitle') }}</h3>
        <p>{{ t('products.apiDesc') }}</p>
      </article>
      <article class="card">
        <h3>{{ t('products.uptimeTitle') }}</h3>
        <p>{{ t('products.uptimeDesc') }}</p>
      </article>
    </section>

    <section id="tools" class="card section">
      <h3>
        {{ t('tools.title') }}
        <span class="badge">{{ badgeLabel }}</span>
      </h3>
      <p class="muted">{{ t('tools.hint') }}</p>
      <div class="tools-actions">
        <button class="cta" type="button" :disabled="busy" @click="runAll">
          {{ t('tools.runAll') }}
        </button>
        <button class="cta secondary" type="button" :disabled="busy" @click="runIp">
          {{ t('tools.publicIp') }}
        </button>
        <button class="cta secondary" type="button" :disabled="busy" @click="runPing">
          {{ t('tools.latency') }}
        </button>
        <button class="cta secondary" type="button" :disabled="busy" @click="runHeaders">
          {{ t('tools.headers') }}
        </button>
      </div>
      <pre class="out">{{ out }}</pre>
    </section>

    <section id="status" class="card section">
      <h3>{{ t('status.title') }}</h3>
      <p>{{ statusText }}</p>
    </section>

    <section id="contact" class="card section contact">
      <h3>{{ t('contact.title') }}</h3>
      <p>{{ t('contact.body') }}</p>
    </section>
  </main>

  <footer class="site-footer">
    <div class="wrap">&copy; {{ year }} {{ siteName }}. {{ t('footer.rights') }}</div>
  </footer>
</template>
