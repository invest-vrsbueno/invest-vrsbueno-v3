# Regras Matemáticas: Simulador de Investimentos

Estrutura lógica e fórmulas matemáticas para cálculo de rendimentos, formatadas para ingestão em bases de dados e sistemas.

## 1. Variáveis Universais
* **C** = Capital inicial aportado
* **i** = Taxa de juros anual (formato decimal)
* **n** = Prazo da aplicação em anos
* **M** = Montante Bruto Final
* **L** = Lucro Bruto (M - C)
* **IR** = Retenção de Imposto de Renda

## 2. Renda Fixa Tributável (CDB, LC, Debêntures)
Ativos sujeitos à tabela regressiva padrão de Imposto de Renda.

**Fórmula:**
`M = C * (1 + i)^n`

**Lógica de Cálculo:**
```text
Lucro_Bruto = M - C

// Lógica Condicional do IR
IF dias_corridos <= 180 THEN aliquota = 0.225
ELSE IF dias_corridos <= 360 THEN aliquota = 0.20
ELSE IF dias_corridos <= 720 THEN aliquota = 0.175
ELSE aliquota = 0.15

IR = Lucro_Bruto * aliquota
Valor_Liquido = M - IR
```

## 3. Renda Fixa Isenta (LCI, LCA, CRI, CRA)
Ativos estruturados com isenção total de Imposto de Renda para pessoa física.

**Fórmula:**
`M = C * (1 + i)^n`

**Lógica de Cálculo:**
```text
IR = 0
Valor_Liquido = M
```

## 4. Renda Fixa Híbrida (Ex: Tesouro IPCA+)
Composição de taxa pré-fixada mais variação do índice inflacionário, incluindo dedução de taxa de custódia (ex: B3).

* **i_fixo** = Taxa fixa contratada
* **IPCA** = Fator da inflação acumulada
* **T_custodia** = Taxa de serviço (ex: 0,20% a.a. = 0.002)

**Fórmula:**
`M = C * (1 + i_fixo)^n * (1 + IPCA)`

**Lógica de Cálculo:**
```text
Lucro_Bruto = M - C
IR = Lucro_Bruto * aliquota_regressiva
Custo_Custodia = M * T_custodia * n  // Cálculo simplificado anualizado

Valor_Liquido = M - IR - Custo_Custodia
```
