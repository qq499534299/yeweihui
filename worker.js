/**
 * Cloudflare Worker - 业委会表单提交 API
 * 接收前端表单数据，写入飞书多维表格
 *
 * 环境变量（在 Worker Settings → Variables 中配置）：
 *   FEISHU_APP_ID, FEISHU_APP_SECRET, FEISHU_APP_TOKEN, FEISHU_TABLE_ID
 */

const FIELD_MAP = {
  name: '姓名',
  building: '楼栋',
  unit: '单元',
  room: '门牌号',
  address: '完整房号',
  phone: '手机号',
  willingnessLabel: '参与意愿',
  submittedAt: '提交时间'
};

let cachedToken = null;
let tokenExpireAt = 0;

async function getAccessToken(env) {
  const now = Date.now();
  if (cachedToken && now < tokenExpireAt) return cachedToken;

  const resp = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: env.FEISHU_APP_ID, app_secret: env.FEISHU_APP_SECRET })
  });

  const data = await resp.json();
  if (data.code !== 0) throw new Error('飞书token失败: ' + (data.msg || '未知错误'));

  cachedToken = data.tenant_access_token;
  tokenExpireAt = now + (data.expire - 300) * 1000;
  return cachedToken;
}

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };

    // Debug endpoint
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/debug') {
      try {
        const token = await getAccessToken(env);
        const resp = await fetch(`https://open.feishu.cn/open-apis/bitable/v1/apps/${env.FEISHU_APP_TOKEN}/tables/${env.FEISHU_TABLE_ID}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await resp.json();
        return new Response(JSON.stringify({ token_ok: true, table: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, message: '仅支持POST' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    try {
      if (!env.FEISHU_APP_ID || !env.FEISHU_APP_SECRET || !env.FEISHU_APP_TOKEN || !env.FEISHU_TABLE_ID) {
        return new Response(JSON.stringify({ success: false, message: '服务配置不完整' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const body = await request.json();

      if (!body.name || !body.unit || !body.room || !body.phone) {
        return new Response(JSON.stringify({ success: false, message: '请填写必填字段' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const fields = {};
      fields[FIELD_MAP.name] = body.name;
      fields[FIELD_MAP.building] = body.building || '';
      fields[FIELD_MAP.unit] = body.unit;
      fields[FIELD_MAP.room] = body.room;
      fields[FIELD_MAP.address] = body.address;
      fields[FIELD_MAP.phone] = body.phone;
      fields[FIELD_MAP.willingnessLabel] = body.willingnessLabel || body.willingness;
      fields[FIELD_MAP.submittedAt] = body.submittedAt;

      const token = await getAccessToken(env);
      await fetch(`https://open.feishu.cn/open-apis/bitable/v1/apps/${env.FEISHU_APP_TOKEN}/tables/${env.FEISHU_TABLE_ID}/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ fields })
      });

      return new Response(JSON.stringify({ success: true, message: '提交成功' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ success: false, message: err.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};
