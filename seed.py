import csv
import re

sql_file = 'c:/PROJETOS/invest-vrsbueno-v3/architecture/supabase_schema.sql'
csv_file = 'c:/PROJETOS/invest-vrsbueno-v3/INVEST_R2.csv'

with open(sql_file, 'r', encoding='utf-8') as f:
    sql = f.read()

if '-- SEED DADOS' in sql:
    sql = sql.split('-- SEED DADOS')[0]

inserts = ['-- SEED DADOS DA PLANILHA\nINSERT INTO investimentos (tipo, emissor, indexador_tipo, taxa, instituicao_agrupadora, valor_aplicado, data_aplicacao, data_vencimento) VALUES']

values = []
with open(csv_file, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    header = next(reader)
    for row in reader:
        if not row or len(row) < 8 or not row[0].strip(): continue
        ativo = row[0]
        inst_agrup = row[1]
        aplic = row[2].replace('R$', '').replace('.', '').replace(',', '.').strip()
        
        parts = [p.strip() for p in ativo.split(' - ')]
        
        if len(parts) >= 4:
            tipo = parts[0]
            emissor = parts[1]
            idx = parts[2]
            taxa_raw = parts[3]
        else:
            tipo = parts[0]
            emissor = parts[1]
            idx = 'desconhecido'
            taxa_raw = '0'

        m = re.search(r'([\d\.]+)', taxa_raw.replace(',', '.'))
        taxa = m.group(1) if m else '0'
        
        d_app = row[6].strip()
        d_venc = row[7].strip()
        
        def fmt_dt(dt):
            if not dt or dt.lower() == 'none' or not dt.strip(): return 'NULL'
            parts = dt.split('/')
            if len(parts) == 3:
                return f"'{parts[2]}-{parts[1]}-{parts[0]}'"
            return 'NULL'
            
        d_app_sql = fmt_dt(d_app)
        d_venc_sql = fmt_dt(d_venc)
        
        values.append(f"('{tipo}', '{emissor}', '{idx}', {taxa}, '{inst_agrup}', {aplic}, {d_app_sql}, {d_venc_sql})")

sql += '\n' + inserts[0] + '\n' + ',\n'.join(values) + ';\n'

with open(sql_file, 'w', encoding='utf-8') as f:
    f.write(sql)

print('Success')
