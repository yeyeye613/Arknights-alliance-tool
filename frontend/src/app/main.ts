import { createApp } from "vue"
import "@/app/styles/base.css"
import App from "@/app/App.vue"
import { initServiceWorker } from "@/infrastructure/pwa/usePwaUpdate"

createApp(App).mount('#app')

// 生产构建下注册 Service Worker（预缓存 + 图片缓存 + 新版本提示）
initServiceWorker()
