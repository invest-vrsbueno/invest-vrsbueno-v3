"""Dashboard de Investimentos BUD — GridStack + NEXFI Design
Cards arrastáveis via GridStack.js · Design extraído da referência NEXFI.
"""
import datetime as dt
import json
import math
import pathlib
import numpy as np
import pandas as pd
import streamlit as st
import streamlit.components.v1 as components
import plotly.graph_objects as go
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import threading
from dotenv import load_dotenv
env_path = pathlib.Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

def enviar_alerta_fgc(detalhes_risco_list):
    """Envia um e-mail silencioso caso o FGC passe do limite (Disparo Único por sessão)."""
    sender = os.environ.get("EMAIL_SENDER")
    password = os.environ.get("EMAIL_PASSWORD")
    receiver = os.environ.get("EMAIL_RECEIVER", "vrsbueno@gmail.com")
    
    if not sender or not password or "sua_senha_de_app_aqui" in password:
        return False
        
    assunto = "⚠️ ALERTA: Cobertura FGC Excedida - Investimentos BUD"
    
    linhas_bancos = ""
    for d in detalhes_risco_list:
        v_str = f"R$ {d['excesso']:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        linhas_bancos += f"<li><b>{d['banco']}</b>: {v_str} excedentes</li>\\n"
        
    html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <div style="border: 1px solid #ef4444; border-radius: 8px; padding: 20px; max-width: 500px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #ef4444; margin-top: 0;">🛡️ Cobertura FGC - Risco Detectado</h2>
            <p>Os seguintes bancos da sua carteira de Renda Fixa ultrapassaram o limite de segurança do FGC:</p>
            <ul>
                {linhas_bancos}
            </ul>
            <p style="margin-bottom: 0;"><i>Enviado automaticamente pelo Dashboard de Investimentos BUD.</i></p>
        </div>
      </body>
    </html>
    """
    msg = MIMEMultipart("alternative")
    msg["Subject"] = assunto
    msg["From"] = sender
    msg["To"] = receiver
    msg.attach(MIMEText(html, "html"))
    
    try:
        server = smtplib.SMTP_SSL("smtp.gmail.com", 465)
        server.login(sender, password)
        server.sendmail(sender, receiver, msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print("Erro ao enviar email FGC:", e)
        return False

def enviar_email(assunto, html):
    """Envia um e-mail genérico (para relatórios ou alertas) disparado pelo Dashboard."""
    sender = os.environ.get("EMAIL_SENDER")
    password = os.environ.get("EMAIL_PASSWORD")
    receiver = os.environ.get("EMAIL_RECEIVER", "vrsbueno@gmail.com")
    
    if not sender or not password or "sua_senha_de_app_aqui" in password:
        return False, "Credenciais ausentes no .env"
        
    msg = MIMEMultipart("alternative")
    msg["Subject"] = assunto
    msg["From"] = sender
    msg["To"] = receiver
    msg.attach(MIMEText(html, "html"))
    
    try:
        server = smtplib.SMTP_SSL("smtp.gmail.com", 465)
        server.login(sender, password)
        server.sendmail(sender, receiver, msg.as_string())
        server.quit()
        return True, ""
    except Exception as e:
        print(f"Erro ao enviar email ({assunto}):", e)
        return False, str(e)

@st.dialog("Simulador Avançado de Projeções (Meta Selic)", width="large")
def modal_simulador_selic():
    import numpy as np
    from gsheet_loader import carregar_meta_selic, append_meta_selic
    
    df_selic = carregar_meta_selic("")
    if df_selic.empty:
        st.error("Erro ao carregar a base Meta Selic ou ela está vazia!")
        return
        
    st.markdown("Preencha os novos moldes da aplicação a ser projetada.")
    c1, c2, c3, c4 = st.columns(4)
    valor = c1.number_input("Valor Projetado (R$)", min_value=0.0, value=10000.0, step=1000.0)
    dt_inicio = c2.date_input("Data de Início", value=dt.date.today(), format="DD/MM/YYYY")
    dt_fim = c3.date_input("Data Final (Vencimento)", value=dt.date.today() + dt.timedelta(days=365*2), format="DD/MM/YYYY")
    taxa_cdi = c4.number_input("Taxa (% CDI)", min_value=0.0, value=100.0, step=5.0)

    # Transform in timestamp
    t_inicio = pd.Timestamp(dt_inicio)
    t_fim = pd.Timestamp(dt_fim)
    
    if t_fim <= t_inicio:
        st.warning("A data de vencimento deve ser maior que a data de início.")
        return
        
    max_date_selic = df_selic["Data final"].max()
    
    # Validação do limite: Se a data não está prevista
    if not pd.isna(max_date_selic) and t_fim > max_date_selic:
        st.error(f"Infelizmente não é possível projetar pois a data final ({t_fim.strftime('%d/%m/%Y')}) não foi prevista pelo banco central. Limite da planilha: **{max_date_selic.strftime('%d/%m/%Y')}**.", icon=":material/error:")
        with st.expander("Inserir Nova Tranche Meta Selic", expanded=True, icon=":material/add:"):
            sc1, sc2, sc3 = st.columns([1,1,1])
            proxima_data = max_date_selic + pd.Timedelta(days=1)
            ns_inicio = sc1.date_input("Data Inicial", value=proxima_data.date(), format="DD/MM/YYYY")
            ns_fim = sc2.date_input("Data Final", value=t_fim.date(), format="DD/MM/YYYY")
            ns_taxa = sc3.number_input("Nova Taxa Selic (% a.a.)", min_value=0.0, value=10.5, step=0.25)
            
            if st.button("Adicionar Projeção à Tabela Oficial do BC", type="primary", icon=":material/playlist_add:"):
                with st.spinner("Conectando na Google API p/ inserir meta..."):
                    if append_meta_selic(ns_inicio, ns_fim, ns_taxa):
                        st.success("Nova tranche inserida! Atualizando painel...", icon=":material/check_circle:")
                        st.rerun()
        return

    # Se passar pelo bloqueio, exibimos Botão do Simulador
    if st.button("Calcular Viabilidade do Investimento", type="primary", use_container_width=True, icon=":material/calculate:"):
        with st.spinner("Mapeando histórico Selic multi-rate..."):
            # Calculo dia-a-dia
            datas = pd.date_range(t_inicio, t_fim, freq="D")
            curva = []
            patrimonio = float(valor)
            
            # Helper para buscar a taxa para uma dada data
            for d in datas:
                if np.is_busday(d.date()):
                    rs = df_selic[(df_selic["Data inicial"] <= d) & ((df_selic["Data final"].isna()) | (df_selic["Data final"] >= d))]
                    if not rs.empty:
                        taxa_ano = rs.iloc[-1]["% a.a."]
                    else:
                        taxa_ano = CDI_ANUAL_PADRAO * 100 # Fallback 
                        
                    taxa_dia = (taxa_ano / 100.0) * (taxa_cdi / 100.0)
                    patrimonio *= (1 + taxa_dia) ** (1/252)
                curva.append(patrimonio)
                
            fig_sim = go.Figure()
            fig_sim.add_trace(go.Scatter(
                x=datas.strftime("%Y-%m-%d").tolist(),
                y=curva,
                mode="lines", line=dict(color="#00bfa5", width=3),
                fill="tozeroy", fillcolor="rgba(0,191,165,0.15)",
                name="Projeção",
            ))
            fig_sim.add_hline(y=valor, line_dash="dash", line_color="#8b8fa8", annotation_text="Investimento Inicial")
            
            fig_sim.update_layout(
                paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                margin=dict(l=0, r=0, t=10, b=20),
                xaxis=dict(showgrid=False),
                yaxis=dict(showgrid=True, gridcolor="#e2e4f0", tickprefix="R$ ")
            )
            st.plotly_chart(fig_sim, use_container_width=True)
            
            rendimento = patrimonio - valor
            lucro_pct = (rendimento / valor) * 100
            
            st.markdown("### <span class='material-symbols-rounded' style='vertical-align:bottom'>analytics</span> Relatório de Viabilidade e Alertas", unsafe_allow_html=True)
            rm1, rm2 = st.columns(2)
            rm1.metric("Montante Final Bruto", f"R$ {patrimonio:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."))
            rm2.metric("Rentabilidade Bruta", f"{lucro_pct:.2f}%")
            
            # Avisos IRPF Regressivo
            if (t_fim - t_inicio).days <= 180:
                alerta_ir = "**Atenção (IR MÁXIMO):** O saque ocorrerá em menos de 180 dias. O Imposto de Renda baterá na alíquota punitiva de **22,5%** da sua rentabilidade."
                st.error(alerta_ir, icon=":material/warning:")
            elif (t_fim - t_inicio).days <= 360:
                alerta_ir = "**Atenção:** O saque ocorrerá entre 180 e 360 dias. O Imposto incidirá em **20%**."
                st.warning(alerta_ir, icon=":material/warning:")
            elif (t_fim - t_inicio).days <= 720:
                alerta_ir = "**Bom:** O saque será feito após 1 ano. A mordida da Receita cai para **17,5%**."
                st.info(alerta_ir, icon=":material/lightbulb:")
            else:
                alerta_ir = "**Ótimo:** Aplicação de longo prazo retém a menor alíquota regimental de IR (**15%**)! Maximizando ganhos da Selic projetada."
                st.success(alerta_ir, icon=":material/star:")
            
            if st.button("Enviar Relatório por E-mail", use_container_width=True, icon=":material/mail:"):
                # Call email function
                ass_email = "📋 Relatório Simulação de Investimento - BUD"
                crp_html = f"""
                <html>
                  <body style="font-family: Arial, sans-serif; color: #333;">
                    <div style="border: 1px solid #00bfa5; border-radius: 8px; padding: 20px; max-width: 500px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <h2 style="color: #00bfa5; margin-top: 0;">📊 Simulador de Retabilidade - Relatório Oficial</h2>
                        <p><b>Simulação de:</b> R$ {valor:,.2f}</p>
                        <p><b>Período:</b> {t_inicio.strftime('%d/%m/%Y')} a {t_fim.strftime('%d/%m/%Y')} ({ (t_fim - t_inicio).days } dias)</p>
                        <p><b>Montante Bruto Alcançado:</b> R$ {patrimonio:,.2f}</p>
                        <p><b>Rentabilidade Bruta Projetada:</b> {lucro_pct:.2f}%</p>
                        <hr>
                        <p><i>As recomendações de imposto regressivo foram processadas e validadas pela plataforma: Caso saque nas datas alvos, você receberá a alíquota compatível.</i></p>
                        <p style="margin-bottom: 0px; font-size:12px; color:#999"><i>Enviado automaticamente pelo Dashboard de Investimentos BUD.</i></p>
                    </div>
                  </body>
                </html>
                """
                
                with st.spinner("Despachando relatorio por SMTP..."):
                    sucesso, erro_msg = enviar_email(ass_email, crp_html)
                    if sucesso:
                        st.success("Relatório despachado com sucesso para o seu E-mail!", icon=":material/mark_email_read:")
                    else:
                        st.error(f"Falha ao enviar e-mail: {erro_msg}", icon=":material/error:")

from calc_engine import processar_planilha, curva_diaria, CDI_ANUAL_PADRAO, valor_no_dia
from gsheet_loader import carregar_google_sheet, append_ativo, remove_ativo, CREDS_PATH

LAYOUT_JSON_PATH = pathlib.Path(__file__).resolve().parent / "layout.json"
LIMITE_FGC_DEFAULT = 250_000
CORES = ["#00bfa5","#6c63ff","#f97316","#3b82f6","#ec4899",
         "#14b8a6","#8b5cf6","#f59e0b","#ef4444","#06b6d4"]

st.set_page_config(
    page_title="Investimentos BUD",
    page_icon="💹",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Streamlit Chrome CSS ──────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0');
#MainMenu, footer { visibility: hidden; }
header[data-testid="stHeader"] { background: transparent !important; pointer-events: none; }
[data-testid="collapsedControl"] { pointer-events: auto; visibility: visible !important; z-index:9999; }
html, body, [class*="css"] { font-family: 'Inter', sans-serif !important; }
.block-container { padding: 0 !important; max-width: 100% !important; }
section[data-testid="stSidebar"] {
    background: #ffffff !important;
    border-right: 1px solid #ced3de !important;
}
section[data-testid="stSidebar"] label,
section[data-testid="stSidebar"] .stMarkdown p { color: #8b8fa8 !important; font-size: 0.82rem; }
section[data-testid="stSidebar"] h3 { color: #1a1d27 !important; }
[data-testid="stDialog"] div[role="dialog"] {
    max-width: 900px !important;
    width: 70vw !important;
}
</style>
""", unsafe_allow_html=True)

# ── Sidebar ───────────────────────────────────────────────────
with st.sidebar:
    st.markdown("### <span class='material-symbols-rounded' style='vertical-align:bottom'>monitoring</span> Investimentos BUD", unsafe_allow_html=True)
    st.caption("Dashboard de Renda Fixa")
    st.markdown("---")
    is_dark = False
    st.markdown("**<span class='material-symbols-rounded' style='vertical-align:bottom'>settings</span> Parâmetros**", unsafe_allow_html=True)
    if st.button("📊 Simulador Selic", use_container_width=True, type="primary"):
        modal_simulador_selic()
    
    cdi_anual   = CDI_ANUAL_PADRAO
    data_ref    = st.date_input("Data Base", value=dt.date.today(), format="DD/MM/YYYY")
    limite_fgc  = st.number_input("Limite FGC (R$)", value=LIMITE_FGC_DEFAULT, step=10_000)
    st.markdown("---")
    if st.button("Resetar Layout", icon=":material/refresh:", use_container_width=True):
        st.markdown("""<script>localStorage.removeItem('bud_layout_v1'); location.reload();</script>""",
                    unsafe_allow_html=True)
    st.markdown("---")
    with st.expander("Layout Personalizado"):
        st.caption("Para manter essa sua configuração para sempre, copie do navegador e cole aqui:")
        layout_text = st.text_area("Cole seu layout (JSON)", placeholder='[{"id":"kpi1","x":0,"y":0,"w":2,"h":3}...]')
        if st.button("Salvar como Padrão Oficial", icon=":material/save:"):
            if layout_text.strip():
                try:
                    parsed = json.loads(layout_text)
                    with open(LAYOUT_JSON_PATH, "w", encoding="utf-8") as f:
                        json.dump(parsed, f)
                    st.success("Salvo! Limpe a aba ou reinicie a página.")
                except Exception as e:
                    st.error(f"Erro: JSON Inválido. {e}")

# ── Data loading (Google Sheets → fallback local) ────────────
if not CREDS_PATH.exists():
    st.error(f"Credenciais não encontradas: `{CREDS_PATH}`")
    st.stop()

df_raw, fonte_dados = carregar_google_sheet(str(CREDS_PATH))
df = processar_planilha(df_raw, cdi_anual=cdi_anual, data_ref=data_ref)

# Indicador de fonte de dados na sidebar
with st.sidebar:
    if fonte_dados == "google_sheets":
        st.caption("<span class='material-symbols-rounded' style='vertical-align:bottom'>cloud</span> Fonte: Google Sheets (online)", unsafe_allow_html=True)
    else:
        st.caption("<span class='material-symbols-rounded' style='vertical-align:bottom'>folder_open</span> Fonte: Arquivo local (fallback)", unsafe_allow_html=True)
renda_fixa   = df[df["CATEGORIA"] == "Renda Fixa (CDB/LCA/LCI)"].copy()
saldo_caixa  = df[df["CATEGORIA"] != "Renda Fixa (CDB/LCA/LCI)"].copy()

# ── Métricas ──────────────────────────────────────────────────
total_aplicado = float(df["APLICADO"].sum())
total_hoje     = float(df["POSICAO_HOJE"].sum())
total_rendido  = float(df["RENDIMENTO_ACUMULADO_HOJE"].sum())
rend_pct       = (total_rendido / total_aplicado * 100) if total_aplicado else 0.0
total_proj     = float(renda_fixa["RENDIMENTO_PROJETADO"].sum())
n_ativos       = len(renda_fixa)
total_sc       = float(saldo_caixa["APLICADO"].sum())

por_inst = (
    df.groupby("INSTITUIÇÃO")["POSICAO_HOJE"].sum()
    .reset_index().sort_values("POSICAO_HOJE", ascending=False)
).reset_index(drop=True)
por_inst["Aplicado"]   = df.groupby("INSTITUIÇÃO")["APLICADO"].sum().reindex(por_inst["INSTITUIÇÃO"]).values
por_inst["StatusCode"] = por_inst["POSICAO_HOJE"].apply(
    lambda x: "danger" if x > limite_fgc else ("warning" if x > limite_fgc * 0.9 else "ok")
)
risco_score  = int((por_inst["StatusCode"] == "danger").sum())
alerta_score = int((por_inst["StatusCode"] == "warning").sum())

fgc_details = []
if risco_score > 0:
    for _, row in por_inst[por_inst["StatusCode"] == "danger"].iterrows():
        margem = row["POSICAO_HOJE"] - limite_fgc
        fgc_details.append({"banco": str(row["INSTITUIÇÃO"]), "excesso": float(margem)})

    # Dispara e-mail unicamente no dia/estado atual
    alerta_key = f"fgc_email_sent_{data_ref}"
    if alerta_key not in st.session_state:
        st.session_state[alerta_key] = True
        def _send():
            enviar_alerta_fgc(fgc_details)
        threading.Thread(target=_send).start()
        st.toast("⚠️ Alerta FGC de Risco enviado para seu e-mail!", icon="✉️")

# ── Helpers ───────────────────────────────────────────────────
def safe_float(v):
    try:
        f = float(v)
        return 0.0 if (math.isnan(f) or math.isinf(f)) else f
    except Exception:
        return 0.0

# ── Plotly config ─────────────────────────────────────────────
text_c  = "#e2e4f0" if is_dark else "#1a1d27"
grid_c  = "#2a2b3d" if is_dark else "#ced3de"
bg_card = "#1a1b2e" if is_dark else "#ffffff"
bg_app  = "#0e0f17" if is_dark else "#edf0f5"

# PBASE sem xaxis/yaxis para evitar conflito em update_layout(**PBASE, xaxis=...)
PBASE = dict(
    paper_bgcolor="rgba(0,0,0,0)",
    plot_bgcolor="rgba(0,0,0,0)",
    font=dict(family="Inter", color=text_c, size=11),
    margin=dict(l=4, r=4, t=8, b=36),
)
XAX = dict(showgrid=False, tickfont=dict(color=text_c, size=10))
YAX = dict(showgrid=True, gridcolor=grid_c, tickfont=dict(color=text_c, size=10), zeroline=False)

# ── Chart 1: Curva patrimonial ────────────────────────────────
fig_curva = go.Figure()
if not renda_fixa.empty:
    curvas_list = [curva_diaria(r, data_ref) for _, r in renda_fixa.iterrows()]
    df_cv = pd.concat([c for c in curvas_list if not c.empty], axis=1, sort=True).sum(axis=1)
    df_cv_w = df_cv.resample("W").last().dropna()
    fig_curva.add_trace(go.Scatter(
        x=df_cv_w.index.strftime("%Y-%m-%d").tolist(),
        y=[safe_float(v) for v in df_cv_w.values],
        mode="lines", name="Portfólio",
        line=dict(color="#00bfa5", width=2.5),
        fill="tozeroy", fillcolor="rgba(0,191,165,0.10)",
    ))
    fig_curva.add_hline(y=total_aplicado, line_dash="dash", line_color="#8b8fa8",
        annotation_text="Aplicado", annotation_position="bottom right",
        annotation_font=dict(color=text_c, size=9))
fig_curva.update_layout(**PBASE, showlegend=False,
    xaxis=dict(**XAX, tickformat="%b %y"),
    yaxis=dict(**YAX, tickprefix="R$ ", tickformat=",.0f"),
)
curva_json = json.loads(fig_curva.to_json())

# ── Chart 2: Pie ─────────────────────────────────────────────
fig_pie = go.Figure(go.Pie(
    labels=por_inst["INSTITUIÇÃO"].tolist(),
    values=[safe_float(v) for v in por_inst["POSICAO_HOJE"]],
    hole=0.55,
    marker=dict(colors=CORES[:len(por_inst)]),
    textfont=dict(color="#ffffff", size=10),
    hovertemplate="<b>%{label}</b><br>R$ %{value:,.0f}<br>%{percent}<extra></extra>",
))
pie_layout = {**PBASE, "showlegend": True,
    "legend": dict(font=dict(size=9, color=text_c), orientation="v", x=1.0),
}
pie_layout.pop("xaxis", None)
pie_layout.pop("yaxis", None)
fig_pie.update_layout(**pie_layout)
pie_json = json.loads(fig_pie.to_json())

# ── Chart 3: Resumo anual ─────────────────────────────────────
anos = sorted(renda_fixa["VENC"].dt.year.dropna().unique().astype(int)) if not renda_fixa.empty else []
anual_rows = []
for ano in anos:
    vence  = safe_float(renda_fixa[renda_fixa["VENC"].dt.year == ano]["RENDIMENTO_PROJETADO"].sum())
    t_ini  = pd.Timestamp(f"{ano}-01-01")
    t_fim  = pd.Timestamp(f"{ano}-12-31")
    gerado = 0.0
    for _, r in renda_fixa.iterrows():
        if pd.isna(r["DATA"]) or pd.isna(r.get("VENC")): continue
        if r["VENC"] < t_ini or r["DATA"] > t_fim: continue
        v1 = valor_no_dia(r["APLICADO"], r["TAXA_EFETIVA"], r["DATA"], max(t_ini, r["DATA"]), r["VENC"])
        v2 = valor_no_dia(r["APLICADO"], r["TAXA_EFETIVA"], r["DATA"], min(t_fim, r["VENC"]), r["VENC"])
        gerado += max(0.0, safe_float(v2) - safe_float(v1))
    anual_rows.append({"ano": ano, "vence": vence, "gerado": gerado})

anos_str = [str(r["ano"]) for r in anual_rows]
fig_anual = go.Figure()
fig_anual.add_trace(go.Bar(x=anos_str, y=[r["vence"] for r in anual_rows],
    name="Vence no Ano", marker_color="#00bfa5", marker_line_width=0))
fig_anual.add_trace(go.Bar(x=anos_str, y=[r["gerado"] for r in anual_rows],
    name="Gerado no Ano", marker_color="#6c63ff", marker_line_width=0))
fig_anual.update_layout(**PBASE, barmode="group",
    xaxis=dict(**XAX, type="category"),
    yaxis=dict(**YAX, tickprefix="R$ "),
    legend=dict(font=dict(size=9, color=text_c), orientation="h", y=-0.35, x=0),
)
anual_json = json.loads(fig_anual.to_json())

# ── Chart 4: FGC ─────────────────────────────────────────────
bar_colors = [
    "#ef4444" if s == "danger" else ("#f97316" if s == "warning" else "#00bfa5")
    for s in por_inst["StatusCode"]
]
fig_fgc = go.Figure(go.Bar(
    x=[safe_float(v) for v in por_inst["POSICAO_HOJE"]],
    y=por_inst["INSTITUIÇÃO"].tolist(),
    orientation="h",
    marker_color=bar_colors,
    marker_line_width=0,
    hovertemplate="<b>%{y}</b><br>R$ %{x:,.0f}<extra></extra>",
))
fig_fgc.add_vline(x=limite_fgc, line_dash="dash", line_color="#ef4444",
    annotation_text="Limite FGC",
    annotation_position="top right",
    annotation_font=dict(color="#ef4444", size=9))
fgc_layout = {**PBASE,
    "xaxis": dict(showgrid=True, gridcolor=grid_c, tickprefix="R$ ",
                  tickfont=dict(color=text_c, size=10)),
    "yaxis": dict(showgrid=False, tickfont=dict(color=text_c, size=10), automargin=True),
    "margin": dict(l=4, r=16, t=8, b=28),
}
fig_fgc.update_layout(**fgc_layout, showlegend=False)
fgc_json = json.loads(fig_fgc.to_json())

# ── Payload para JS ───────────────────────────────────────────
holdings_list = []
for i, row in por_inst.iterrows():
    holdings_list.append({
        "name":    str(row["INSTITUIÇÃO"]),
        "value":   safe_float(row["POSICAO_HOJE"]),
        "aplicado": safe_float(row["Aplicado"]),
        "status":  str(row["StatusCode"]),
        "color":   CORES[int(i) % len(CORES)],
        "pct":     safe_float(row["POSICAO_HOJE"] / total_hoje * 100) if total_hoje else 0.0,
    })

saldo_js = []
for _, r in saldo_caixa.iterrows():
    saldo_js.append({
        "ativo": str(r["ATIVO"]),
        "inst":  str(r["INSTITUIÇÃO"]),
        "valor": safe_float(r["APLICADO"]),
    })

# ── Tabela RF para Streamlit nativo ──────────────────────────
rf_table = renda_fixa[[
    "ATIVO","TIPO","INSTITUIÇÃO","INDEXADOR","TAXA_NOMINAL",
    "APLICADO","POSICAO_HOJE","RENDIMENTO_ACUMULADO_HOJE","RENDIMENTO_PROJETADO","DATA","VENC"
]].copy().rename(columns={
    "ATIVO":"Ativo","TIPO":"Tipo","INSTITUIÇÃO":"Instituição","INDEXADOR":"Indexador",
    "TAXA_NOMINAL":"Taxa","APLICADO":"Aplicado (R$)","POSICAO_HOJE":"Posição (R$)",
    "RENDIMENTO_ACUMULADO_HOJE":"Rend. Acum. (R$)","RENDIMENTO_PROJETADO":"Proj. Venc. (R$)",
    "DATA":"Aplicação","VENC":"Vencimento",
})

default_layout = None
if LAYOUT_JSON_PATH.exists():
    try:
        with open(LAYOUT_JSON_PATH, "r", encoding="utf-8") as f:
            default_layout = json.load(f)
    except:
        pass

payload = {
    "isDark": is_dark,
    "defaultLayout": default_layout,
    "bgApp":  bg_app,
    "bgCard": bg_card,
    "kpis": {
        "patrimonio": total_hoje,
        "aplicado":   total_aplicado,
        "rendido":    total_rendido,
        "pct":        rend_pct,
        "projetado":  total_proj,
        "nAtivos":    n_ativos,
        "saldoCaixa": total_sc,
        "risco":      risco_score,
        "alerta":     alerta_score,
        "detalhes":   fgc_details,
    },
    "holdings":   holdings_list,
    "saldoList":  saldo_js,
    "limiteFgc":  limite_fgc,
    "anualRows":  anual_rows,
    "charts": {
        "curva": curva_json,
        "pie":   pie_json,
        "anual": anual_json,
        "fgc":   fgc_json,
    },
}
DATA_JS = json.dumps(payload, ensure_ascii=False, default=str)

# ── HTML / GridStack component ────────────────────────────────
FGC_H = max(4, len(por_inst))   # dynamic height for FGC grid rows

HTML = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/gridstack@11.3.0/dist/gridstack.min.css"/>
<style>
/* ── CSS Variables ── */
:root {{
  --bg:      #edf0f5;
  --card:    #ffffff;
  --border:  #ced3de;
  --text:    #1a1d27;
  --muted:   #8b8fa8;
  --shadow:  0 3px 18px rgba(0,0,0,0.09);
  --radius:  16px;
  --accent:  #00bfa5;
  --accent2: #6c63ff;
}}
body.dark {{
  --bg:     #0e0f17;
  --card:   #1a1b2e;
  --border: #2a2b3d;
  --text:   #e2e4f0;
  --muted:  #5a5d7a;
  --shadow: 0 2px 16px rgba(0,0,0,0.35);
}}

*, *::before, *::after {{ box-sizing: border-box; margin:0; padding:0; }}
html, body {{ height: 100%; }}
body {{
  background: var(--bg);
  color: var(--text);
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  padding: 10px 12px 24px;
  transition: background .25s, color .25s;
}}

/* ── GridStack ── */
.grid-stack {{ background: transparent !important; }}
.grid-stack-placeholder > .placeholder-content {{
  background: var(--accent);
  opacity: .12;
  border-radius: var(--radius);
  border: 2px dashed var(--accent);
}}
.grid-stack-item {{ cursor: default; }}
.grid-stack-item-content {{
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: background .25s, border-color .25s, box-shadow .25s;
}}
.grid-stack-item-content:hover {{
  box-shadow: 0 6px 28px rgba(0,0,0,0.10);
}}

/* ── Card anatomy ── */
.card-header {{
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px 6px;
  cursor: grab;
  user-select: none;
  flex-shrink: 0;
}}
.card-header:active {{ cursor: grabbing; }}
.card-title {{
  font-size: 0.72rem; font-weight: 600;
  color: var(--muted); text-transform: uppercase; letter-spacing: .06em;
}}
.card-icon {{ font-size: 15px; color: var(--muted); }}
.card-body {{
  padding: 4px 18px 14px;
  flex: 1; overflow: hidden;
}}
.card-body.scrollable {{ overflow-y: auto; }}
.card-sep {{ border: none; border-top: 1px solid var(--border); margin: 0 18px; }}

/* ── KPI ── */
.kpi-val {{
  font-size: 1.55rem; font-weight: 700; color: var(--text);
  line-height: 1.2; margin-bottom: 4px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}}
.kpi-sub {{ font-size: 0.72rem; color: var(--muted); font-weight: 500; }}
.kpi-badge {{
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 0.7rem; font-weight: 600;
  padding: 3px 9px; border-radius: 20px; margin-top: 8px;
}}
.badge-up   {{ background: rgba(0,191,165,.13);  color: #00bfa5; }}
.badge-dn   {{ background: rgba(239,68,68,.13);  color: #ef4444; }}
.badge-warn {{ background: rgba(249,115,22,.13); color: #f97316; }}
.badge-neu  {{ background: rgba(108,99,255,.13); color: #6c63ff; }}

/* ── Holdings ── */
.hold-item {{
  display: flex; align-items: center; gap: 10px;
  padding: 9px 0; border-bottom: 1px solid var(--border);
}}
.hold-item:last-child {{ border-bottom: none; }}
.hold-ico {{
  width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 700; font-size: 10px; letter-spacing: -.5px;
}}
.hold-name {{ font-weight: 600; font-size: .82rem; color: var(--text); }}
.hold-sub  {{ font-size: .7rem; color: var(--muted); margin-top: 1px; }}
.hold-rt   {{ margin-left: auto; text-align: right; flex-shrink: 0; }}
.hold-val  {{ font-size: .82rem; font-weight: 600; color: var(--text); }}
.hold-bar-wrap {{ height: 3px; background: var(--border); border-radius: 2px; margin-top: 4px; width: 56px; }}
.hold-bar  {{ height: 100%; border-radius: 2px; }}
.dot       {{ width:7px; height:7px; border-radius:50%; display:inline-block; margin-right:3px; }}
.d-ok      {{ background:#00bfa5; }}
.d-warn    {{ background:#f97316; }}
.d-dn      {{ background:#ef4444; }}

/* ── Saldo table ── */
.sc-row {{
  display: flex; justify-content: space-between; align-items: center;
  padding: 7px 0; border-bottom: 1px solid var(--border); font-size: .8rem;
}}
.sc-row:last-child {{ border-bottom: none; }}
.sc-name {{ color: var(--text); font-weight: 500; max-width: 65%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }}
.sc-val  {{ color: var(--text); font-weight: 600; }}

/* ── Anual table ── */
.anual-row {{
  display: grid; grid-template-columns: 60px 1fr 1fr;
  align-items: center; gap: 8px;
  padding: 6px 0; border-bottom: 1px solid var(--border); font-size: .78rem;
}}
.anual-row:last-child {{ border-bottom: none; }}
.anual-ano  {{ font-weight: 700; color: var(--accent); }}
.anual-val  {{ color: var(--text); font-weight: 500; }}

/* ── Drag hint ── */
.drag-hint {{
  text-align: center; color: var(--muted);
  font-size: .68rem; padding: 10px 0 2px; opacity: .7; letter-spacing: .04em;
}}

/* ── Float Btns inside JS ── */
.float-btn-wrap {{
  position: fixed; bottom: 18px; right: 18px; z-index: 9999;
  display: flex; gap: 8px;
}}
.float-btn {{
  background: var(--card); border: 1px solid var(--border);
  border-radius: 8px; color: var(--muted);
  font-size: .72rem; font-family: Inter, sans-serif;
  padding: 6px 12px; cursor: pointer; box-shadow: var(--shadow);
  transition: all .15s;
}}
.float-btn:hover {{ color: var(--accent); border-color: var(--accent); }}

/* ── Lock Btns ── */
.lock-btn {{
  color: #cfd5e1; cursor: pointer; transition: 0.2s color; font-size: 19px !important; margin-right: 6px; user-select: none;
}}
.lock-btn:hover {{ color: #8b8fa8; }}
</style>
</head>
<body class="{'dark' if is_dark else ''}">
<div class="float-btn-wrap">
  <button class="float-btn" onclick="copyLayout()"><span class="material-symbols-rounded" style="font-size:14px; vertical-align:middle;">content_copy</span> Copiar Meu Layout</button>
  <button class="float-btn" onclick="resetLayout()"><span class="material-symbols-rounded" style="font-size:14px; vertical-align:middle;">refresh</span> Reset Layout</button>
</div>

<div class="grid-stack" id="g">

  <!-- KPI 1: Patrimônio -->
  <div class="grid-stack-item" gs-id="kpi1" gs-x="0" gs-y="0" gs-w="2" gs-h="3">
    <div class="grid-stack-item-content">
      <div class="card-header"><span class="card-title">Patrimônio Total</span><div style="display:flex; align-items:center;"><span class="lock-btn material-symbols-rounded" onclick="toggleLock(this)" title="Travar card">lock_open</span><span class="card-icon material-symbols-rounded">work</span></div></div>
      <hr class="card-sep">
      <div class="card-body">
        <div class="kpi-val" id="v-pat"></div>
        <div class="kpi-sub">Posição atual</div>
        <div class="kpi-badge badge-up" id="v-pat-b"></div>
      </div>
    </div>
  </div>

  <!-- KPI 2: Aplicado -->
  <div class="grid-stack-item" gs-id="kpi2" gs-x="2" gs-y="0" gs-w="2" gs-h="3">
    <div class="grid-stack-item-content">
      <div class="card-header"><span class="card-title">Capital Aplicado</span><div style="display:flex; align-items:center;"><span class="lock-btn material-symbols-rounded" onclick="toggleLock(this)" title="Travar card">lock_open</span><span class="card-icon material-symbols-rounded">account_balance</span></div></div>
      <hr class="card-sep">
      <div class="card-body">
        <div class="kpi-val" id="v-apl"></div>
        <div class="kpi-sub" id="v-apl-b"></div>
        <div class="kpi-badge badge-neu" id="v-apl-n"></div>
      </div>
    </div>
  </div>

  <!-- KPI 3: Rendido -->
  <div class="grid-stack-item" gs-id="kpi3" gs-x="4" gs-y="0" gs-w="2" gs-h="3">
    <div class="grid-stack-item-content">
      <div class="card-header"><span class="card-title">Rend. Acumulado</span><div style="display:flex; align-items:center;"><span class="lock-btn material-symbols-rounded" onclick="toggleLock(this)" title="Travar card">lock_open</span><span class="card-icon material-symbols-rounded">trending_up</span></div></div>
      <hr class="card-sep">
      <div class="card-body">
        <div class="kpi-val" id="v-rnd"></div>
        <div class="kpi-sub">Até hoje</div>
        <div class="kpi-badge badge-up" id="v-rnd-b"></div>
      </div>
    </div>
  </div>

  <!-- KPI 4: Projetado -->
  <div class="grid-stack-item" gs-id="kpi4" gs-x="6" gs-y="0" gs-w="2" gs-h="3">
    <div class="grid-stack-item-content">
      <div class="card-header"><span class="card-title">Proj. Vencimento</span><div style="display:flex; align-items:center;"><span class="lock-btn material-symbols-rounded" onclick="toggleLock(this)" title="Travar card">lock_open</span><span class="card-icon material-symbols-rounded">track_changes</span></div></div>
      <hr class="card-sep">
      <div class="card-body">
        <div class="kpi-val" id="v-prj"></div>
        <div class="kpi-sub">Rendimento esperado</div>
        <div class="kpi-badge badge-neu" id="v-prj-b"></div>
      </div>
    </div>
  </div>

  <!-- KPI 5: Saldo/Caixa -->
  <div class="grid-stack-item" gs-id="kpi5" gs-x="8" gs-y="0" gs-w="2" gs-h="3">
    <div class="grid-stack-item-content">
      <div class="card-header"><span class="card-title">Saldo / Caixa</span><div style="display:flex; align-items:center;"><span class="lock-btn material-symbols-rounded" onclick="toggleLock(this)" title="Travar card">lock_open</span><span class="card-icon material-symbols-rounded">savings</span></div></div>
      <hr class="card-sep">
      <div class="card-body">
        <div class="kpi-val" id="v-sc"></div>
        <div class="kpi-sub">Liquidez imediata</div>
        <div class="kpi-badge badge-neu" id="v-sc-b"></div>
      </div>
    </div>
  </div>

  <!-- KPI 6: FGC -->
  <div class="grid-stack-item" gs-id="kpi6" gs-x="10" gs-y="0" gs-w="2" gs-h="3">
    <div class="grid-stack-item-content">
      <div class="card-header"><span class="card-title">Cobertura FGC</span><div style="display:flex; align-items:center;"><span class="lock-btn material-symbols-rounded" onclick="toggleLock(this)" title="Travar card">lock_open</span><span class="card-icon material-symbols-rounded">security</span></div></div>
      <hr class="card-sep">
      <div class="card-body">
        <div class="kpi-val" id="v-fgc"></div>
        <div class="kpi-sub" id="v-fgc-s"></div>
        <div class="kpi-badge" id="v-fgc-b"></div>
      </div>
    </div>
  </div>

  <!-- Curva patrimonial -->
  <div class="grid-stack-item" gs-id="curva" gs-x="0" gs-y="3" gs-w="8" gs-h="5">
    <div class="grid-stack-item-content">
      <div class="card-header"><span class="card-title">Evolução Patrimonial Estimada</span><div style="display:flex; align-items:center;"><span class="lock-btn material-symbols-rounded" onclick="toggleLock(this)" title="Travar card">lock_open</span><span class="card-icon material-symbols-rounded">monitoring</span></div></div>
      <hr class="card-sep">
      <div class="card-body" style="padding-top:8px">
        <div id="chart-curva" style="width:100%;height:100%;min-height:200px"></div>
      </div>
    </div>
  </div>

  <!-- Holdings -->
  <div class="grid-stack-item" gs-id="holdings" gs-x="8" gs-y="3" gs-w="4" gs-h="5">
    <div class="grid-stack-item-content">
      <div class="card-header"><span class="card-title">Distribuição por Instituição</span><div style="display:flex; align-items:center;"><span class="lock-btn material-symbols-rounded" onclick="toggleLock(this)" title="Travar card">lock_open</span><span class="card-icon material-symbols-rounded">account_balance</span></div></div>
      <hr class="card-sep">
      <div class="card-body scrollable" id="holdings-body" style="padding-top:8px"></div>
    </div>
  </div>

  <!-- Pie -->
  <div class="grid-stack-item" gs-id="pie" gs-x="0" gs-y="8" gs-w="4" gs-h="5">
    <div class="grid-stack-item-content">
      <div class="card-header"><span class="card-title">Alocação %</span><div style="display:flex; align-items:center;"><span class="lock-btn material-symbols-rounded" onclick="toggleLock(this)" title="Travar card">lock_open</span><span class="card-icon material-symbols-rounded">pie_chart</span></div></div>
      <hr class="card-sep">
      <div class="card-body" style="padding-top:8px">
        <div id="chart-pie" style="width:100%;height:100%;min-height:200px"></div>
      </div>
    </div>
  </div>

  <!-- Resumo Anual -->
  <div class="grid-stack-item" gs-id="anual" gs-x="4" gs-y="8" gs-w="8" gs-h="5">
    <div class="grid-stack-item-content">
      <div class="card-header"><span class="card-title">Resumo Anual — Vencimento vs. Gerado</span><div style="display:flex; align-items:center;"><span class="lock-btn material-symbols-rounded" onclick="toggleLock(this)" title="Travar card">lock_open</span><span class="card-icon material-symbols-rounded">calendar_month</span></div></div>
      <hr class="card-sep">
      <div class="card-body" style="padding-top:8px">
        <div id="chart-anual" style="width:100%;height:180px"></div>
        <div id="anual-table" style="margin-top:8px;"></div>
      </div>
    </div>
  </div>

  <!-- FGC Chart -->
  <div class="grid-stack-item" gs-id="fgc" gs-x="0" gs-y="13" gs-w="8" gs-h="{FGC_H}">
    <div class="grid-stack-item-content">
      <div class="card-header"><span class="card-title">Cobertura FGC por Instituição</span><div style="display:flex; align-items:center;"><span class="lock-btn material-symbols-rounded" onclick="toggleLock(this)" title="Travar card">lock_open</span><span class="card-icon material-symbols-rounded">security</span></div></div>
      <hr class="card-sep">
      <div class="card-body" style="padding-top:8px">
        <div id="chart-fgc" style="width:100%;height:100%;min-height:180px"></div>
      </div>
    </div>
  </div>

  <!-- Saldo/Caixa list -->
  <div class="grid-stack-item" gs-id="saldo" gs-x="8" gs-y="13" gs-w="4" gs-h="{FGC_H}">
    <div class="grid-stack-item-content">
      <div class="card-header"><span class="card-title">Saldo / Caixa</span><div style="display:flex; align-items:center;"><span class="lock-btn material-symbols-rounded" onclick="toggleLock(this)" title="Travar card">lock_open</span><span class="card-icon material-symbols-rounded">savings</span></div></div>
      <hr class="card-sep">
      <div class="card-body scrollable" id="saldo-body" style="padding-top:8px"></div>
    </div>
  </div>

</div>

<p class="drag-hint">✦ Arraste os cards pelo cabeçalho para reorganizar · Posição salva automaticamente</p>

<!-- Scripts -->
<script src="https://cdn.plot.ly/plotly-2.35.0.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gridstack@11.3.0/dist/gridstack-all.min.js"></script>
<script>
const D = {DATA_JS};

// ── Formatação ──────────────────────────────────────────────
function fR(v) {{
  if (v == null || isNaN(v)) return 'R$ 0';
  return 'R$ ' + v.toLocaleString('pt-BR', {{minimumFractionDigits:0, maximumFractionDigits:0}});
}}
function fPct(v) {{ return (v||0).toFixed(1) + '%'; }}

// ── KPIs ─────────────────────────────────────────────────────
const K = D.kpis;
// Patrimônio
document.getElementById('v-pat').textContent = fR(K.patrimonio);
document.getElementById('v-pat-b').textContent = '↑ ' + fPct(K.pct) + ' s/ aplicado';

// Aplicado
document.getElementById('v-apl').textContent = fR(K.aplicado);
document.getElementById('v-apl-b').textContent = K.nAtivos + ' ativos de renda fixa';
document.getElementById('v-apl-n').textContent = '🔒 Principal';

// Rendido
document.getElementById('v-rnd').textContent = fR(K.rendido);
document.getElementById('v-rnd-b').textContent = '↑ acumulado';

// Projetado
document.getElementById('v-prj').textContent = fR(K.projetado);
document.getElementById('v-prj-b').textContent = '+ lucro estimado';

// Saldo/Caixa
document.getElementById('v-sc').textContent = fR(K.saldoCaixa);
document.getElementById('v-sc-b').textContent = '↗ disponível';

// FGC
const fgcEl  = document.getElementById('v-fgc');
const fgcSub = document.getElementById('v-fgc-s');
const fgcB   = document.getElementById('v-fgc-b');
if (K.risco > 0) {{
  fgcEl.textContent  = K.risco + ' banco' + (K.risco > 1 ? 's' : '');
  const nomesFora = K.detalhes.map(d => d.banco).join(', ');
  fgcSub.innerHTML = '<span style="color:#ef4444; font-weight:600;">Fora: ' + nomesFora + '</span>';
  fgcB.textContent   = '⚠ Risco Ativo';
  fgcB.className     = 'kpi-badge badge-dn';
}} else if (K.alerta > 0) {{
  fgcEl.textContent  = K.alerta + ' banco' + (K.alerta > 1 ? 's' : '');
  fgcSub.textContent = 'Menos de 10% de margem';
  fgcB.textContent   = '⚡ Alerta';
  fgcB.className     = 'kpi-badge badge-warn';
}} else {{
  fgcEl.textContent  = '100%';
  fgcSub.textContent = 'Todos dentro do limite';
  fgcB.textContent   = '✓ Protegido';
  fgcB.className     = 'kpi-badge badge-up';
}}

// ── Holdings list ─────────────────────────────────────────────
const hBody = document.getElementById('holdings-body');
D.holdings.forEach(h => {{
  const dotCls = h.status === 'danger' ? 'd-dn' : (h.status === 'warning' ? 'd-warn' : 'd-ok');
  const barW   = Math.min(h.pct, 100).toFixed(1);
  hBody.innerHTML += `<div class="hold-item">
    <div class="hold-ico" style="background:${{h.color}}">${{h.name.substring(0,2).toUpperCase()}}</div>
    <div>
      <div class="hold-name">${{h.name}}</div>
      <div class="hold-sub"><span class="dot ${{dotCls}}"></span>${{h.pct.toFixed(0)}}% do portfólio</div>
    </div>
    <div class="hold-rt">
      <div class="hold-val">${{fR(h.value)}}</div>
      <div class="hold-bar-wrap"><div class="hold-bar" style="background:${{h.color}};width:${{barW}}%"></div></div>
    </div>
  </div>`;
}});

// ── Anual table ───────────────────────────────────────────────
const anualT = document.getElementById('anual-table');
D.anualRows.forEach(r => {{
  anualT.innerHTML += `<div class="anual-row">
    <span class="anual-ano">${{r.ano}}</span>
    <span class="anual-val" title="Vence">${{fR(r.vence)}}</span>
    <span class="anual-val" title="Gerado">${{fR(r.gerado)}}</span>
  </div>`;
}});

// ── Saldo list ────────────────────────────────────────────────
const scBody = document.getElementById('saldo-body');
D.saldoList.forEach(s => {{
  scBody.innerHTML += `<div class="sc-row">
    <span class="sc-name" title="${{s.ativo}}">${{s.ativo}}</span>
    <span class="sc-val">${{fR(s.valor)}}</span>
  </div>`;
}});
const scTotal = D.saldoList.reduce((a,s)=>a+s.valor,0);
scBody.innerHTML += `<div style="padding:8px 0;font-weight:700;font-size:.82rem;color:var(--accent)">Total: ${{fR(scTotal)}}</div>`;

// ── Plotly charts ─────────────────────────────────────────────
const pCfg = {{responsive: true, displayModeBar: false}};

function renderCharts() {{
  Plotly.newPlot('chart-curva', D.charts.curva.data, D.charts.curva.layout, pCfg);
  Plotly.newPlot('chart-pie',   D.charts.pie.data,   D.charts.pie.layout,   pCfg);
  Plotly.newPlot('chart-anual', D.charts.anual.data, D.charts.anual.layout, pCfg);
  Plotly.newPlot('chart-fgc',   D.charts.fgc.data,   D.charts.fgc.layout,   pCfg);
}}
renderCharts();

// ── GridStack ─────────────────────────────────────────────────
const grid = GridStack.init({{
  float: false,
  animate: true,
  cellHeight: 70,
  margin: 8,
  column: 12,
  draggable: {{ handle: '.card-header' }},
  resizable: {{ handles: 'se,sw' }},
}});

// ── Lock System ───────────────────────────────────────────────
function toggleLock(btn) {{
  const item = btn.closest('.grid-stack-item');
  const isLocked = btn.textContent === 'lock';
  if (isLocked) {{
    grid.update(item, {{locked: false, noMove: false, noResize: false}});
    btn.textContent = 'lock_open';
    btn.style.color = '#cfd5e1';
  }} else {{
    grid.update(item, {{locked: true, noMove: true, noResize: true}});
    btn.textContent = 'lock';
    btn.style.color = '#ef4444';
  }}
}}

// Resize Plotly when cards move/resize
function resizeAllCharts() {{
  ['chart-curva','chart-pie','chart-anual','chart-fgc'].forEach(id => {{
    const el = document.getElementById(id);
    if (el) Plotly.Plots.resize(el);
  }});
}}
grid.on('dragstop resizestop', () => {{
  setTimeout(resizeAllCharts, 50);
}});

// ── localStorage persistence ──────────────────────────────────
const LKEY = 'bud_layout_v1';
function saveLayout() {{
  try {{ localStorage.setItem(LKEY, JSON.stringify(grid.save(false))); }} catch(e) {{}}
}}
function copyLayout() {{
  const saved = localStorage.getItem(LKEY) || (D.defaultLayout ? JSON.stringify(D.defaultLayout) : null);
  if (saved) {{
    navigator.clipboard.writeText(saved);
    alert("Pronto! Seu layout atual foi copiado.\\n\\nAcesse a barra lateral esquerda em '🛠️ Layout Personalizado', cole este código e clique em Salvar para torná-lo oficial.");
  }} else {{
    alert("Nenhum layout modificado para copiar. (Arraste algum card primeiro)");
  }}
}}
function loadLayout() {{
  try {{
    const saved = localStorage.getItem(LKEY);
    if (saved) {{
      const items = JSON.parse(saved);
      grid.load(items, false);
      setTimeout(resizeAllCharts, 150);
    }} else if (D.defaultLayout && D.defaultLayout.length > 0) {{
      grid.load(D.defaultLayout, false);
      setTimeout(resizeAllCharts, 150);
    }}
  }} catch(e) {{ localStorage.removeItem(LKEY); }}
}}
function resetLayout() {{
  localStorage.removeItem(LKEY);
  location.reload();
}}

grid.on('change', saveLayout);
// Delay load to allow GridStack to initialize
setTimeout(loadLayout, 100);
</script>
</body>
</html>"""

# ── Render principal ──────────────────────────────────────────
components.html(HTML, height=1700, scrolling=True)

# ── Seção nativa: Tabela de Ativos ───────────────────────────
st.markdown("""
<style>
[data-testid="stDataFrame"] { border-radius: 12px; overflow: hidden; border: 1px solid #e8eaf0; }
</style>
""", unsafe_allow_html=True)

@st.dialog("Adicionar Ativo")
def modal_adicionar_ativo():
    with st.form("form_novo_ativo", clear_on_submit=False):
        fc1, fc2, fc3 = st.columns([2, 2, 2])
        fd1, fd2, fd3 = st.columns([2, 2, 2])

        tipo_novo     = fc1.selectbox("Tipo", ["CDB", "LCA", "LCI"], key="f_tipo")
        inst_nova     = fc2.text_input("Instituição", placeholder="Ex: DAYCOVAL", key="f_inst")
        indexador_novo = fc3.selectbox("Indexador", ["Pré-Fixado", "Pós-Fixado"], key="f_idx")

        taxa_nova     = fd1.number_input("Taxa (%)", min_value=0.0, max_value=999.0,
                                          value=14.0, step=0.01, format="%.2f", key="f_taxa")
        aplicado_novo = fd2.number_input("Valor Aplicado (R$)", min_value=0.0,
                                          value=1000.0, step=100.0, format="%.2f", key="f_apl")
        corretora_nova = fd3.text_input("Corretora", placeholder="Ex: XP", key="f_corr")

        fe1, fe2 = st.columns(2)
        data_aplic    = fe1.date_input("Data de Aplicação", value=dt.date.today(), key="f_data", format="DD/MM/YYYY")
        data_venc     = fe2.date_input("Data de Vencimento", value=dt.date.today() + dt.timedelta(days=365), key="f_venc", format="DD/MM/YYYY")

        submitted = st.form_submit_button("Atualizar Ativos", type="secondary",
                                          use_container_width=True)

    if submitted:
        corretora_str = f" ({corretora_nova.strip().upper()})" if corretora_nova.strip() else ""
        ativo_texto = f"{tipo_novo} - {inst_nova.strip().upper()}{corretora_str} - {indexador_novo} - {taxa_nova:.2f}%"

        if not inst_nova.strip():
            st.warning("⚠️ Preencha a Instituição antes de salvar.")
        elif data_venc <= data_aplic:
            st.warning("⚠️ A data de vencimento deve ser posterior à data de aplicação.")
        else:
            with st.spinner("Salvando no Google Sheets…"):
                ok = append_ativo(
                    ativo=ativo_texto,
                    instituicao=inst_nova.strip().upper(),
                    aplicado=aplicado_novo,
                    data_aplicacao=data_aplic,
                    vencimento=data_venc,
                )
            if ok:
                st.success(f"✅ Ativo **{ativo_texto}** adicionado com sucesso!")
                if hasattr(st, "rerun"):
                    st.rerun()

@st.dialog("Remover Ativo")
def modal_remover_ativo():
    if rf_table.empty:
        st.warning("Sua carteira no momento não possui ativos para remover.")
        return

    if 'confirm_rem_ativo' not in st.session_state:
        st.session_state.confirm_rem_ativo = None

    if st.session_state.confirm_rem_ativo is None:
        st.markdown("Selecione o ativo que deseja remover. **Esta ação excluirá a linha completa no Google Sheets.**")
        ativo_rem = st.selectbox("Selecione o ativo:", rf_table["Ativo"].tolist(), key="f_rem_sel_ui")
        
        if st.button("Confirmar Remoção", type="primary", use_container_width=True):
            st.session_state.confirm_rem_ativo = ativo_rem
            if hasattr(st, "rerun"):
                st.rerun()
    else:
        alvo = st.session_state.confirm_rem_ativo
        st.warning(f"tem certeza que gostaria de remover - {alvo} ?")
        c1, c2 = st.columns(2)
        with c1:
            if st.button("Sim", type="primary", use_container_width=True):
                st.session_state.confirm_rem_ativo = None
                with st.spinner("Removendo linha correspondente no Google Sheets…"):
                    ok = remove_ativo(alvo)
                if ok:
                    st.success(f"✅ **{alvo[:40]}...** removido com sucesso!")
                    if hasattr(st, "rerun"):
                        st.rerun()
        with c2:
            if st.button("Não", use_container_width=True):
                st.session_state.confirm_rem_ativo = None
                if hasattr(st, "rerun"):
                    st.rerun()


# Cabeçalho da Tabela e custom CSS robusto
st.markdown("---")
st.markdown("""
<style>
/* Card nativo Streamlit para a Tabela e espaçamentos globais */
div[data-testid="stVerticalBlockBorderWrapper"] {
    background-color: #ffffff !important;
    border: 1px solid #ced3de !important;
    border-radius: 8px !important;
    padding: 1rem 1.5rem !important;
    box-shadow: 0 4px 12px rgba(6,11,38,0.05) !important;
    margin: 8px 12px 1.5rem 12px !important;
}
div[data-testid="stVerticalBlockBorderWrapper"] [data-testid="stVerticalBlock"] {
    gap: 0.5rem !important;
}

/* 1. Botão Principal + ATIVO configurado via type="secondary" */
div[data-testid="stHorizontalBlock"] button[kind="secondary"] {
    background-color: #3b82f6 !important;
    border-color: #3b82f6 !important;
    color: white !important;
}

/* 2. Botão Modal + ATIVO (Atualizar Ativos) configurado via type="secondary" */
div[role="dialog"][aria-label="Adicionar Ativo"] button[kind="secondary"] {
    background-color: #3b82f6 !important;
    border-color: #3b82f6 !important;
    color: white !important;
}
</style>
""", unsafe_allow_html=True)

with st.container(border=True):
    col_tit, col_add, col_rem = st.columns([7.5, 1.25, 1.25], gap="medium", vertical_alignment="bottom")
    with col_tit:
        st.markdown("#### <span class='material-symbols-rounded' style='vertical-align:bottom'>table_chart</span> Tabela Completa — Renda Fixa", unsafe_allow_html=True)
    with col_add:
        # Usando style "secondary" como hook seguro para CSS de Azul sem corromper alinhamentos
        if st.button("ATIVO", icon=":material/add:", use_container_width=True, type="secondary"):
            modal_adicionar_ativo()
    with col_rem:
        if st.button("ATIVO", icon=":material/remove:", use_container_width=True, type="primary"):
            modal_remover_ativo()

    st.dataframe(
        rf_table,
        use_container_width=True,
        hide_index=True,
        column_config={
            "Ativo":          st.column_config.TextColumn("Ativo", width="large"),
            "Tipo":           st.column_config.TextColumn("Tipo", width="small"),
            "Instituição":    st.column_config.TextColumn("Instituição"),
            "Indexador":      st.column_config.TextColumn("Indexador"),
            "Taxa":           st.column_config.NumberColumn("Taxa", format="%.2f%%"),
            "Aplicado (R$)":  st.column_config.NumberColumn("Aplicado", format="R$ %.0f"),
            "Posição (R$)":   st.column_config.NumberColumn("Posição Hoje", format="R$ %.0f"),
            "Rend. Acum. (R$)": st.column_config.NumberColumn("Rend. Acum.", format="R$ %.0f"),
            "Proj. Venc. (R$)": st.column_config.NumberColumn("Proj. Venc.", format="R$ %.0f"),
            "Aplicação":      st.column_config.DateColumn("Aplicação", format="DD/MM/YYYY"),
            "Vencimento":     st.column_config.DateColumn("Vencimento", format="DD/MM/YYYY"),
        },
    )

# ── Seção nativa: Drill-down individual ──────────────────────
with st.expander("Drill-down — Curva Individual por Ativo", expanded=False):
    if not renda_fixa.empty:
        sel = st.selectbox("Selecione o ativo:", renda_fixa["ATIVO"].tolist(), key="sel_ativo")
        row_s = renda_fixa[renda_fixa["ATIVO"] == sel].iloc[0]
        curva_s = curva_diaria(row_s, data_ref)
        if not curva_s.empty:
            fig_d = go.Figure()
            fig_d.add_trace(go.Scatter(
                x=curva_s.index.strftime("%Y-%m-%d").tolist(),
                y=[safe_float(v) for v in curva_s.values],
                mode="lines", line=dict(color="#6c63ff", width=2.5),
                fill="tozeroy", fillcolor="rgba(108,99,255,.08)",
                name=str(sel)[:40],
            ))
            fig_d.add_hline(y=safe_float(row_s["APLICADO"]), line_dash="dash",
                line_color="#8b8fa8", annotation_text="Aplicado")
            fig_d.update_layout(**PBASE, showlegend=False, height=220,
                xaxis=dict(**XAX, tickformat="%b %y"),
                yaxis=dict(**YAX, tickprefix="R$ "),
            )
            m1, m2, m3, m4 = st.columns(4)
            m1.metric("Aplicado",      f"R$ {safe_float(row_s['APLICADO']):,.0f}".replace(",",".")  )
            m2.metric("Posição Hoje",  f"R$ {safe_float(row_s['POSICAO_HOJE']):,.0f}".replace(",","."),
                      f"+R$ {safe_float(row_s['RENDIMENTO_ACUMULADO_HOJE']):,.0f}".replace(",","."))
            m3.metric("Proj. Venc.",   f"R$ {safe_float(row_s['APLICADO']+row_s['RENDIMENTO_PROJETADO']):,.0f}".replace(",","."))
            taxa_s = f"{row_s['TAXA_NOMINAL']*100:.2f}%" if row_s["TAXA_NOMINAL"] else "—"
            m4.metric("Taxa", taxa_s, row_s.get("INDEXADOR","") or "")
            st.plotly_chart(fig_d, use_container_width=True)
    else:
        st.info("Nenhum ativo de renda fixa encontrado.")
# Forcing Streamlit reload
