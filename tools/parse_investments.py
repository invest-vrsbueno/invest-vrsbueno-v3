import csv
import json
import re
import os
from datetime import datetime

def parse_currency(value_str):
    if not value_str or value_str.strip() == '':
        return 0.0
    val = value_str.replace('R$', '').strip()
    if val == '-':
        return 0.0
    if ',' in val and '.' in val:
        val = val.replace('.', '').replace(',', '.')
    elif ',' in val:
        val = val.replace(',', '.')
    try:
        return float(val)
    except Exception:
        return 0.0

def parse_date(date_str):
    if not date_str or date_str.strip() == '':
        return None
    try:
        return datetime.strptime(date_str.strip(), '%d/%m/%Y').strftime('%Y-%m-%d')
    except Exception:
        return None

def process_ativo(ativo_str):
    """
    Exemplo: 'CDB - ORIGINAL (XP) - Pré-Fixado - 17.36%'
             'LCI - BRB (XP) - Pós-Fixado - 130% CDI'
             'CDB - PARANA - Pré-Fixado - 15.5%'
    """
    if not ativo_str:
        return None

    # Splitting using ' - ' to avoid cutting inside 'Pré-Fixado'
    parts = [p.strip() for p in ativo_str.split(' - ')]
    
    if len(parts) >= 3:
        tipo = parts[0]
        if tipo not in ["CDB", "LCA", "LCI", "LF"]:
            return None # Ignora linhas como "SALDO MP", "fgts"
        
        emissor_bruto = parts[1]
        
        indexador_nome = parts[2] if len(parts) > 2 else ""
        taxa_str = parts[3].strip() if len(parts) > 3 else parts[-1].strip()

        indexador_tipo = "PRÉ" if "pré" in indexador_nome.lower() else "PÓS"
        
        # Parse da taxa
        taxa = 0.0
        taxa_num = re.findall(r'[\d\.,]+', taxa_str)
        if taxa_num:
            val = taxa_num[0].replace(',', '.')
            try:
                taxa = float(val)
            except ValueError:
                pass

        return {
            "tipo": tipo,
            "emissor": emissor_bruto,
            "indexador_tipo": indexador_tipo,
            "taxa": taxa
        }
    return None

def process_csv(input_file, output_file):
    results = []
    
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            ativo_field = row.get('ATIVO', '')
            parsed_ativo = process_ativo(ativo_field)
            
            if parsed_ativo:
                val_aplicado = parse_currency(row.get(' APLICADO', row.get('APLICADO', '')))
                
                dt_aplicacao = row.get(' DATA', row.get('DATA', ''))
                dt_vencimento = row.get('VENC', '')
                
                instituicao_agrupadora = row.get('INSTITUIÇÃO', '').strip()

                investimento = {
                    "tipo": parsed_ativo["tipo"],
                    "emissor": parsed_ativo["emissor"],
                    "indexador_tipo": parsed_ativo["indexador_tipo"],
                    "taxa": parsed_ativo["taxa"],
                    "instituicao_agrupadora": instituicao_agrupadora,
                    "valor_aplicado": val_aplicado,
                    "data_aplicacao": parse_date(dt_aplicacao),
                    "data_vencimento": parse_date(dt_vencimento)
                }
                results.append(investimento)

    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, 'w', encoding='utf-8') as out:
        json.dump(results, out, ensure_ascii=False, indent=2)

    print(f"✅ Processamento concluído! {len(results)} ativos extraídos.")

if __name__ == "__main__":
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    INPUT = os.path.join(BASE_DIR, 'INVEST_R2.csv')
    OUTPUT = os.path.join(BASE_DIR, '.tmp', 'parsed_investments.json')
    process_csv(INPUT, OUTPUT)
