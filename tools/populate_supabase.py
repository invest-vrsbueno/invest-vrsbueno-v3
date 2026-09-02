import os
import json
import urllib.request
import urllib.error

# Carrega var local simples se dotenv nao estiver disponivel
def load_env():
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                if '=' in line and not line.startswith('#'):
                    key, val = line.strip().split('=', 1)
                    os.environ[key] = val.strip(' "\'')

def get_supabase_headers():
    url = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
    key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    
    if not url or not key:
        return None, None
        
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    return url, headers

def main():
    load_env()
    
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    json_path = os.path.join(base_dir, '.tmp', 'parsed_investments.json')
    
    url, headers = get_supabase_headers()
    
    if not url or 'seu-projeto' in url:
        print("⚠️ Supabase URL / Keys não configurados no .env. Pule a inserção por enquanto.")
        print("👉 Execute o DDL de 'architecture/supabase_schema.sql' no seu projeto.")
        print("👉 Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.")
        return

    endpoint = f"{url}/rest/v1/investimentos"

    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"❌ Arquivo {json_path} não encontrado. Rode parse_investments.py primeiro.")
        return

    # Limpando a base atual antes de popular (Opcional - Delete para garantir idenpotencia)
    print(f"🔄 Preparando inserção de {len(data)} registros no Supabase...")
    
    # Inserção em massa (Bulk)
    req = urllib.request.Request(endpoint, data=json.dumps(data).encode('utf-8'), headers=headers, method='POST')
    
    try:
        urllib.request.urlopen(req)
        print("✅ Dados populados no Supabase com sucesso!")
    except urllib.error.HTTPError as e:
        print(f"❌ HTTP Error: {e.code} - {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"❌ Erro ao conectar ao Supabase: {e}")

if __name__ == "__main__":
    main()
