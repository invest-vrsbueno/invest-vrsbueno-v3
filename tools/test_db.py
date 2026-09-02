import os
import urllib.request
import json

def load_env():
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                if '=' in line and not line.startswith('#'):
                    key, val = line.strip().split('=', 1)
                    os.environ[key] = val.strip(' "\'')

if __name__ == "__main__":
    load_env()
    
    url = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
    key = os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')

    endpoint = f"{url}/rest/v1/investimentos?select=tipo,emissor,instituicao_agrupadora,valor_aplicado&limit=5"
    
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }
    
    print(f"📡 Testando conexao com Supabase (limit 5): {endpoint}")
    req = urllib.request.Request(endpoint, headers=headers)
    
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            print(f"✅ Conexão OK! Retornou {len(data)} registros.")
            for row in data:
                print(f" - {row['tipo']} | {row['emissor']} [{row['instituicao_agrupadora']}] : R$ {row['valor_aplicado']}")
    except Exception as e:
        print(f"❌ Falha: {e}")
