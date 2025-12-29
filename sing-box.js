const { type, name } = $arguments

// 兜底 outbound（只给 selector 用，绝不进 urltest）
const COMPATIBLE_TAG = 'COMPATIBLE'
const compatible_outbound = {
  tag: COMPATIBLE_TAG,
  type: 'direct'
}

let compatibleAdded = false

// 读取原始配置
let config = JSON.parse($files[0])

// 生成 sing-box 节点
let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? 'collection' : 'subscription',
  platform: 'sing-box',
  produceType: 'internal'
})

// 注入节点
config.outbounds.push(...proxies)

// 提取所有代理 tag（排除 direct / block / dns 等非代理）
const proxyTags = getTags(proxies)

// 按策略组注入节点
config.outbounds.forEach(outbound => {
  if (!Array.isArray(outbound.outbounds)) return

  switch (outbound.tag) {
    case 'all':
      outbound.outbounds.push(...proxyTags)
      break

    case 'all-auto':
      // urltest 只测速真实代理
      outbound.outbounds.push(...proxyTags)
      break

    case 'hk':
    case 'hk-auto':
      outbound.outbounds.push(
        ...getTags(proxies, /港|hk|hongkong|hong kong|🇭🇰/i)
      )
      break

    case 'tw':
    case 'tw-auto':
      outbound.outbounds.push(
        ...getTags(proxies, /台|tw|taiwan|🇹🇼/i)
      )
      break

    case 'jp':
    case 'jp-auto':
      outbound.outbounds.push(
        ...getTags(proxies, /日本|jp|japan|🇯🇵/i)
      )
      break

    case 'sg':
    case 'sg-auto':
      outbound.outbounds.push(
        ...getTags(
          proxies,
          /^(?!.*(?:us)).*(新|sg|singapore|🇸🇬)/i
        )
      )
      break

    case 'us':
    case 'us-auto':
      outbound.outbounds.push(
        ...getTags(proxies, /美|us|united\s?states|🇺🇸/i)
      )
      break
  }
})

// selector 兜底（urltest 不兜底）
config.outbounds.forEach(outbound => {
  if (
    Array.isArray(outbound.outbounds) &&
    outbound.outbounds.length === 0 &&
    outbound.type !== 'urltest'
  ) {
    if (!compatibleAdded) {
      config.outbounds.push(compatible_outbound)
      compatibleAdded = true
    }
    outbound.outbounds.push(COMPATIBLE_TAG)
  }
})

// 输出最终配置
$content = JSON.stringify(config, null, 2)

// ---------- 工具函数 ----------

function getTags(proxies, regex) {
  return (regex ? proxies.filter(p => regex.test(p.tag)) : proxies)
    .map(p => p.tag)
}
