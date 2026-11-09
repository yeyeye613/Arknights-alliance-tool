import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { initServiceWorker } from './composables/usePwaUpdate'

createApp(App).mount('#app')

// 生产构建下注册 Service Worker（预缓存 + 图片缓存 + 新版本提示）
initServiceWorker()
