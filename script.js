/* ==========================================================================
   CONTROLE DE CORREÇÕES OPERACIONAIS — PROSECURITY
   script.js

   Organização (da base para a interface):
     1. CONFIGURAÇÃO     listas, prazos e regras ajustáveis
     2. UTILITÁRIOS      datas, textos, ícones
     3. REPOSITÓRIO      ÚNICO ponto que toca o localStorage  <<< trocar aqui por API/BD
     4. SERVIÇO          regras de negócio: validar, criar, editar, status, histórico
     5. INTERFACE BASE   toast, modal, confirmação
     6. TELAS            dashboard, formulário, listas, indicadores, histórico
     7. EXPORTAÇÃO       CSV e Excel (.xlsx gerado localmente, sem biblioteca)
     8. INICIALIZAÇÃO    carga de dados, dados de demonstração, rotas
   ========================================================================== */
'use strict';

/* ==========================================================================
   1. CONFIGURAÇÃO
   ========================================================================== */
const CONFIG = {
  versao: '3.0.0',
  sincronizacaoSegundos: 10,             // modo servidor: intervalo de atualização entre as máquinas

  prefixo: 'prosecurity.correcoes.v1',   // prefixo das chaves do localStorage
  prazoAlertaDias: 3,                    // pendência aberta há mais que isso => ATRASADO
  diasAlertaOcorrencia: 90,              // ocorrência mais antiga que isso => aviso (não bloqueia)
  reRegex: /^\d{3,8}$/,                  // formato do RE: só números, 3 a 8 dígitos (ajuste se necessário)
  reDica: 'Somente números (3 a 8 dígitos).',
  itensPorPagina: 25,
  // --- Segurança / sessão ---
  sessaoMinutos: 30,                     // encerra a sessão após tanto tempo sem uso
  verificaSessaoMs: 10000,               // frequência da verificação de inatividade
  maxTentativas: 5,                      // tentativas de login antes do bloqueio temporário
  bloqueioMinutos: 5,
  senhaMinimo: 8,
  hashRodadas: 20000,

  gestoes: ['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECO', 'INDIA', 'LIMA', 'PAPA', 'SIERRA'],

  tipos: [
    'Falta indevida',
    'Ponto / Frequência',
    'Escala / Posto',
    'Cobertura / Troca de posto',
    'Horas extras',
    'Adicional noturno',
    'Atestado / Afastamento',
    'Férias',
    'Cadastro do colaborador',
    'Cliente / Contrato incorreto',
    'FT (Folga trabalhada)',
    'Outros'
  ],

  // Status que permitem exclusão definitiva (com confirmação e motivo). Os demais devem ser CANCELADOS.
  statusPermiteExcluir: ['PENDENTE', 'DUPLICIDADE / VALIDAR'],

  // Sugestões para os campos com lista (o usuário pode digitar outros valores).
  // >>> INTEGRAÇÃO FUTURA: carregar estas listas do cadastro oficial (API/planilha).
  supervisoresSugeridos: [
    'BRAVO I', 'BRAVO II', 'BRAVO III', 'BRAVO IV',
    'CHARLIE I', 'CHARLIE II', 'DELTA I', 'DELTA II',
    'ECO I', 'ECO II', 'SIERRA I', 'SIERRA II', 'PAPA I', 'PAPA II', 'INDIA I', 'INDIA II'
  ],
  clientesSugeridos: [
    'CLIENTE DEMO 01 - CT-0001', 'CLIENTE DEMO 02 - CT-0002', 'CLIENTE DEMO 03 - CT-0003', 'CLIENTE DEMO 04 - CT-0004',
    'CLIENTE DEMO 05 - CT-0005', 'CLIENTE DEMO 06 - CT-0006', 'CLIENTE DEMO 07 - CT-0007', 'CLIENTE DEMO 08 - CT-0008'
  ],
  // Cadastros oficiais da empresa (planilhas SUB ÁREA e CLIENTES). Supervisor/Sub área: só estes valores. Cliente: lista de escolha (aceita digitar um novo).
  supervisoresLista: ["ALPHA NI",
    "ALPHA NII",
    "ALPHA NIII",
    "ALPHA NIV",
    "ALPHA NV",
    "ALPHA NVI",
    "ALPHA NVII",
    "ALPHA NVIII",
    "BRAVO I",
    "BRAVO II",
    "BRAVO III",
    "BRAVO IV",
    "CHARLIE I",
    "CHARLIE II",
    "CHARLIE III",
    "CHARLIE IV",
    "DELTA I",
    "DELTA II",
    "DELTA III",
    "ECO I",
    "ECO II",
    "ECO III",
    "ECO IV",
    "INDIA",
    "LIMA I",
    "PAPA I",
    "PAPA II",
    "PAPA III",
    "PAPA IV",
    "SIERRA I",
    "SIERRA II",
    "SIERRA III",
    "SIERRA IV",
    "SIERRA V"],
  clientesLista: ["1300 JURUPIS",
    "14º CARTORIO DA LAPA",
    "ABOUT VILA MARIANA",
    "ACACIAS",
    "ACAL",
    "ACERVO UTIMURA",
    "ACQUA PARK BETHAVILLE",
    "AD 330 ALTO DA BOA VISTA",
    "ADVANCED OFFICE PEDROSO",
    "ALBA",
    "ALCANTARILLA",
    "ALCANTARILLA HILLS",
    "ALIVE",
    "ALLURE",
    "ALPHA STAY",
    "ALPHA VITA",
    "ALTINO RESIDENCIAL CLUBE",
    "ALTTO VILA MADALENA",
    "AM FIGUEIRAS",
    "AMERICAN RESIDENCE",
    "ANA ROSA",
    "ANAPURUS",
    "ANDORINHA",
    "ANTIGUA",
    "APORA",
    "ARBO",
    "ARBO & FLORA",
    "ARBORE ENGENHARIA",
    "ARIZONA 701",
    "ARMANDO PETRELLA",
    "ARNEG",
    "AROEIRA",
    "ARQ VILA MARIANA",
    "ARRUDA",
    "ARTESANO OSCAR PORTO SETOR RESIDENCIAL",
    "ARTHE",
    "ASSOCIACAO THE EURO ROYAL RESIDENCE",
    "ASSOCIAÇÃO ALPHAVILLE LONDRINA 2",
    "ASSOCIAÇÃO ALTA VISTA JUNDIAÍ",
    "ASSOCIAÇÃO SANTA CLARA",
    "ASSOCIAÇÃO VISTA DAS COLINAS",
    "ATLANTA",
    "ATMOSPHERA JUNDIAÍ",
    "ATRIO",
    "ATUA MOOCA",
    "ATYPIK",
    "AUDACE",
    "AUGURI MOOCA",
    "AURA",
    "AUTEM",
    "AUTHENTIC",
    "AVANCE VILA ROMANA",
    "B.PRO",
    "BADEN BADEN FLAT SERVICE",
    "BALKON CAMPO BELO - RES 1",
    "BANDEIRA VILA MADALENA",
    "BANIJAY ESTUDIOS",
    "BARAO DE BELEM",
    "BARAO DE ITAPETININGA",
    "BARAO DE ITATIBA",
    "BARAO DE PEDRA NEGRA",
    "BARRA PARK",
    "BE URBAN METRÔ BROOKLIN",
    "BELVEDERE SAN PAOLO",
    "BEM VIVER BELA VISTA",
    "BEM VIVER MARQUES DE ITU",
    "BERNINI EMPRESARIAL",
    "BEVERLY HILLS - MORUMBI",
    "BIARRITZ",
    "BK30 LARGO DO AROUCHE",
    "BONNAIRE",
    "BONNAIRE BUSINESS SETOR MALL",
    "BONNAIRE BUSINESS SETOR OFFICE",
    "BOREAL MADALENA",
    "BORGES LAGOA - SETOR GERAL",
    "BOTHANICA VILA SONIA",
    "BOTTICELLI",
    "BRASILIANO RESIDENCIAL BROOKLIN",
    "BRECHERET",
    "BRISAS DO SUL",
    "BRISE VERGUEIRO",
    "BROOK BY YOU",
    "BROOKLIN BRICKS",
    "BROOKLIN PARK SPA & CLUB",
    "BROOKLIN SKY MARK",
    "BROOKLYN STUDIOS",
    "C290",
    "CAMINHOS DA LAPA HOME CLUB",
    "CAMPO BELO DU CHAMP",
    "CAMPO BELO MEDICAL CENTER",
    "CARAIBAS",
    "CARPE DIEM",
    "CASA ALTA",
    "CASA DO ATOR",
    "CASA HIGIENOPOLIS CENTRAL",
    "CASA IMPERIAL",
    "CASA JARDIM LAPLACE",
    "CASA JARDIM VILA NOVA CONCEIÇÃO",
    "CASA MARIANA",
    "CASABLANCA",
    "CASTEL CENTER",
    "CASTEL DI GENOVA",
    "CASTEL DI REGGIO",
    "CASTEL DI SAN REMO",
    "CASTEL SARDO",
    "CENEM - CENTRO EMPRESARIAL MORUMBI",
    "CENTRAL PARK - ALTO DE PINHEIROS",
    "CENÁRIO DA VILA",
    "CEREIA",
    "CHACARA DOS PASSAROS",
    "CHACARA SANTA ELENA",
    "CHATEAU TIERRY",
    "CHRISTINA RAPP",
    "CIDADE DE TORRES",
    "CIUDAD REAL",
    "CIVIC CENTER",
    "CLEVELAND",
    "CLIENTE TESTE - 29.06.2021",
    "CLOCK VILA ROMANA NOBRE",
    "CLUB ALTO DE PINHEIROS",
    "CLUBE JARDIM",
    "COLINA 103",
    "COMBINATTO HOME OFFICE",
    "CONCEPT HOUSE",
    "CONDOMINIO VILLA IBIRAPUERA (TORRE 2)",
    "CONDOMÍNIO DO EDIFÍCIO PATRICIA",
    "CONDOMÍNIO EDIFICIO MORUMBI BUSINESS CENTER",
    "CONJUNTO EGEU",
    "CONJUNTO RESIDENCIAL CUPECE",
    "CONNECT OFFICES",
    "CONSULADO GERAL DA ALEMANHA",
    "CONTEMP VILA MARIANA",
    "CONTEMPORÂNEO SAÚDE",
    "CORINTO",
    "CORPORATE PARK",
    "COSMOPOLITAN HIGIENOPOLIS",
    "COSMOS",
    "COSTA DO ATLÂNTICO",
    "COWORKING DE SAÚDE",
    "CRAVINHOS",
    "CRISANTEMO",
    "CRISTAL",
    "CRISTAL TOWER",
    "CRISTAL TOWER - BELA CINTRA",
    "CRISTINA MARIA CUNHA PEREIRA",
    "CYRELA 2014 THE YEAR EDITION",
    "CYRELA ARTI PERDIZES",
    "CYRELA IBIRAPUERA BY YOO",
    "CYRELA MOEMA BY YOO",
    "DALIA",
    "DAMA CONFEITARIA",
    "DATALINK",
    "DEVISATE",
    "DIAMOND TOWER",
    "DOC NOVA CONCEIÇÃO",
    "DOM BOSCO",
    "DOM JARAGUÁ",
    "DOM RICARDO DOM CONDOMINIO DOM RICARDO DOM JOSE",
    "DOMANI BROOKLIN",
    "DOMANI I",
    "DONAIRE",
    "DORNIER MERKUR",
    "DSG ITAIM",
    "E-LIFE MANDAQUI",
    "EDEN WEST",
    "EDIFICIO FLAVIO PENTAGNA GUIMARAES",
    "EDIFICIO LEXINGTON",
    "EDIFICIO PALMELA",
    "EDIFICIO RESIDENCIAL CHEZ PERDIZES",
    "EDIFICIO SÃO PAULO",
    "EDIFÍCIO ART - SETOR TORRE 1",
    "EDIFÍCIO CHRISTINE",
    "EDIFÍCIO DAS AVENCAS",
    "EDIFÍCIO JOÃO DOS REIS",
    "ELCO DO BRASIL",
    "ELDORADO",
    "ELEV VILA PRUDENTE",
    "ELEVA CIDADE JARDIM",
    "ELEVA CUPECÊ",
    "ELEVO MOEMA",
    "ELIZABETH BY HELBOR",
    "EMBAUBA",
    "EMPRESARIAL JARDIM SUL",
    "ENCANTTO HOME CLUBE",
    "ENGENHEIRO ANTONIO SILVA",
    "ENTER MORUMBI",
    "ESPACO MOBILE",
    "ESPAÇO E VIDA",
    "ESPERANÇA",
    "ESPLENDOR",
    "ESSENCIA BROOKLIN",
    "ESSENZA MOEMA",
    "ESTANCIA PUNTA DEL ESTE",
    "ESTAÇÃO BRAS",
    "ESTILO JARDIM AMERICA",
    "ESTILO SAUDE",
    "EVOLUTION FAMILY CLUB",
    "EXCELLENCE KLABIN",
    "EXPAND",
    "EXPANDE VILA MARIANA",
    "FASANO CIDADE JARDIM",
    "FASANO ITAIM",
    "FAZENDA DONA CAROLINA",
    "FAZENDA SANTA PAULA",
    "FEEL JARDIM SUL",
    "FENIX",
    "FIORI PASEO VILA MARIANA 620",
    "FLOR DE LOTUS",
    "FLORAE ACLIMAÇAO",
    "FLORES DO CAMPO",
    "FLORESCE",
    "FLOW PERDIZES",
    "FOLLOW - THE EUREKA BUILDING",
    "FOREST HILLS",
    "FORMA 287",
    "FORT ARICANDUVA",
    "FRANCA",
    "FRANCISCO OBINO CIRNE LIMA",
    "GAROPABA",
    "GENERAL ATLANTIC",
    "GENEVE",
    "GEOKLOCK",
    "GERIBA",
    "GG OFFICE",
    "GGD METAL",
    "GIRASSOL",
    "GO JOAQUIM",
    "GO MARACA",
    "GO PLATÔ",
    "GOLD",
    "GOLDEN PALACE",
    "GOLDEN PARK",
    "GOODLIFE VILA ROMANA",
    "GRAND METROPOLITAN - RESIDENCIAL",
    "GRAND TERRASSE",
    "GRANJARDIM RESIDENCIAL",
    "GREEN GUEDALA",
    "GREEN MOND",
    "GREEN VILLAGE DIADEMA",
    "GROW",
    "GUAINUMBIS",
    "GUEDALA HOUSE",
    "GUIGNARD",
    "H PAULISTA",
    "HABITARTE VERDE",
    "HARMONIA COMERCIAL",
    "HARMONIA DA VILA 1201",
    "HAUS MITRE",
    "HAUS MITRE PLATO IPIRANGA",
    "HELBOR HOME FLEX JARDINS",
    "HELBOR SUPREME",
    "HELPTY",
    "HELVÉTIA",
    "HERING",
    "HI PINHEIROS",
    "HI VIEW ALTO DA BOA VISTA - SETOR HW STYLE",
    "HIGHLAND",
    "HIPICA HOUSE",
    "HOME PAULISTA",
    "HORIZ IBIRAPUERA",
    "HORIZONTOWN RESIDENCE",
    "HUBERT",
    "HUNGRIA",
    "HUSQVARNA",
    "I9 HORTO",
    "IBIRAPUERA HILLS",
    "IBIRAPUERA PARK",
    "IBIZZA",
    "ICON",
    "ICONYC",
    "ICONYC NR",
    "ID JARDIM SUL",
    "IDEA MAKER SOLUTIONS",
    "IGNEZ",
    "IL FARO",
    "ILHA DE MONT SERRAT",
    "IMPERADOR",
    "INAMBUI",
    "INNOVA BLUE",
    "INNOVATORE",
    "INSIDE OUT",
    "INSIGNIA CAMPO BELO",
    "INSTITUTO PENINSULA",
    "INTERCLUBE TORRE GAMA & DELTA",
    "INTERNATIONAL TRADE CENTER",
    "INTERSECTION BROOKLIN",
    "ISLA BY CYRELA",
    "ITABORAI",
    "IUCATA",
    "J.F.G. RESIDENCE",
    "JANETE",
    "JAQUELINE",
    "JARDIM DAS AZALEAS",
    "JARDIM DAS BAHAMAS",
    "JARDIM DAS PRIMAVERAS",
    "JARDIM DOS GIRASSOIS",
    "JARDIM LISBOA",
    "JARDIM RESERVA DA MATA",
    "JERIVÁS",
    "JOIA",
    "JOSE MARTINS BORGES",
    "JOSÉ BONIFÁCIO",
    "KAA",
    "KARPZ JARDINS",
    "KEMIRA",
    "L' UFFICIO MILANO",
    "LAGO AZUL",
    "LAGO DI GARDA",
    "LAGUNA 430",
    "LAKE LOUISE",
    "LANDMARK TATUAPÉ",
    "LARANJEIRAS - SANTO AMARO",
    "LARIS BURITIS",
    "LAS CUMBRES",
    "LAS VENTANAS",
    "LAVIN BARDUSCH ARRENDAMENTOS TEXTEIS EIRELI",
    "LE QUARTIER DU MARAES",
    "LE VILLAGE CASA VERDE",
    "LED BARRA FUNDA - OFFICE",
    "LED BARRA FUNDA - RESIDENCIAL",
    "LEILÃO VIP ALIENAÇÕES PUBLICAS LTDA. - ME",
    "LELLO UNIDA MOOCA - CA",
    "LELLO UNIDADE ABC CONDOMÍNIOS",
    "LELLO UNIDADE ABC IMÓVEIS",
    "LELLO UNIDADE ORATÓRIO",
    "LELLO UNIDADE TATUAPÉ",
    "LIBERTY OFFICES",
    "LIBERTY VILLAGE",
    "LIMITED PINHEIROS",
    "LINA JARDINS",
    "LINEA VILA SÔNIA",
    "LINO 320",
    "LIV BARRA FUNDA",
    "LIVING DREAM PANAMBY",
    "LIVING GRAND WISH",
    "LIVING HEREDITÁ",
    "LIVING INFINITY LAGUNA",
    "LIVING ONE",
    "LIVING RESORT",
    "LIVING VILLAGGIO TATUAPÉ",
    "LIVING WISH",
    "LIVING WISH LAPA",
    "LLOYD WRIGHT",
    "LOFT SÃO PAULO II",
    "LONDON PARK",
    "LONDON PLACE",
    "LONG CHAMPS",
    "LUME - SETOR RESIDENCIAL",
    "LUMIAR",
    "LUZES DA MATA",
    "MADRE CABRINI",
    "MAIS MORUMBI CLUBE",
    "MAISON DE CLERMONT FERRAND",
    "MAISON VEYRON",
    "MANAGER",
    "MANSÃO CHARLIE PARKER",
    "MANSÃO DA FRANCA",
    "MAPLE BEAR",
    "MAPLE BEAR II - CLUBE PAINEIRAS",
    "MARCHETTI PLACE",
    "MARCO ANTONIO",
    "MARIA ADELAIDE",
    "MARIA ANTONIETA",
    "MARQUES DE SEVILHA",
    "MARSEILLE",
    "MARTESE",
    "MAXHAUS PB",
    "MEKNES",
    "MERIDIANO TOP CLUB",
    "METROPOLITAN GARDEN",
    "METRÓPOLIS",
    "MIAMI BUSINESS",
    "MICHIGAN",
    "MID SABARÁ",
    "MIDEA II EDUCAÇÃO INFANTIL",
    "MIGUEL NETO ADVOGADOS ASSOCIADOS",
    "MIRELLA",
    "MIRYADE",
    "MIRÁ",
    "MISCE VILA MADALENA - RESIDENCIAL",
    "MISTI MORUMBI",
    "MN15 IBIRAPUERA",
    "MOA 292",
    "MODERN LIFE - FAGUNDES FILHO",
    "MODERN LIFE BACELAR",
    "MODO IPIRANGA",
    "MODO POMPÉIA - RESIDENCIAL",
    "MOEMA 300",
    "MOEMA BY THE PARK",
    "MOKED - P868",
    "MOKED - P952 TORRE CLODOMIRO",
    "MOKED P035 - GEORGE SAND",
    "MOKED P808 - E.M.B PARTICIPAÇÕES E POSTOS LTDA",
    "MOKED P855",
    "MOKED P943 - PARK LANE",
    "MOKED P944 - HARMONIA RESIDENCIAL",
    "MOKED P953 - TORRE MACURAPE",
    "MONT BLANC",
    "MONT VERT",
    "MONTBRISON",
    "MONTE CARLO",
    "MONTE CELESTE GARDEN",
    "MONTEREY",
    "MOOD ITAQUERA",
    "MORADA DAS PAINEIRAS",
    "MORADA VILLA VERDE",
    "MORUMBI PRIME",
    "MOTTA ADV",
    "MOURATO 111",
    "MPP PARTICIPAÇÕES LTDA",
    "MUNDEO MOEMA BUSINESS",
    "MUNDO APTO - SAUDE",
    "MY ONE JAPÃO LIBERDADE - SETOR RESIDENCIAL",
    "NEO BUTANTÃ",
    "NEO CAPISTRANO",
    "NEW CENTURY OFFICES",
    "NEW ENGLAND",
    "NEW HAMPTON",
    "NEW LIFE",
    "NEW PLACE",
    "NEW WAY",
    "NEW WORK TOWER",
    "NEWCASTLE",
    "NEX ONE ARTUR PRADO",
    "NEXT ONE PEREIRA COUTINHO",
    "NEXT SKY",
    "NIK ALVES GUIMARÃES",
    "NINE 3134",
    "NOB HILL",
    "NOVALATA EMBALAGENS - MOOCA",
    "NUOVO SPAZIO",
    "OBY",
    "ODATA BARUERI",
    "ODATA BRASIL LTDA",
    "ODATA HOLDING ITAIM",
    "ODATA HORTOLÂNDIA",
    "ODATA SANTANA DE PARNAIBA",
    "OFFICE PAULISTA",
    "OLIMPIA SPECIAL SPACE",
    "OLIMPIC CHACARA STO ANTONIO",
    "OLIVIER MORUMBI",
    "OLYMPIA VISTA",
    "ONE VILA SAO FRANCISCO",
    "ONZE VILA CLEMENTINO SETOR RESIDENCIAL",
    "OPEN IPIRANGA",
    "OPUS 95",
    "ORGANIL SOCIEDADE IMOBILIÁRIA LTDA",
    "ORIGINALE",
    "OYAMAR",
    "PAES LEME",
    "PAISAJE PANAMBY ALCANTARILLA",
    "PALAIS ROYAL",
    "PALAZZO FIRENZE",
    "PALLAZZO ANNA CAPRI",
    "PALM HILL",
    "PALM SPRINGS",
    "PALMEIRAS MORUMBY",
    "PAMPLONA STUDIOS",
    "PANAMBY HILLS",
    "PANAMBY PENTHOUSES",
    "PANAMERICANO",
    "PANORAMA VILA ROMANA",
    "PARC D' ORSAY",
    "PARC DE FONTAINEBLEAU",
    "PARC DES ENFANTS",
    "PARC MODERNITÁ",
    "PARC MONCEAU",
    "PARC ROYAL",
    "PARCO DEI PRINCIPI",
    "PARIS 824",
    "PARK AVENUE IBIRAPUERA - SETOR RESIDENCIAL",
    "PARK AVENUE STUDIOS",
    "PARKWAY PANAMBY",
    "PARQUE BARUERI",
    "PARQUE CACHOEIRA",
    "PARQUE CIDADE JARDIM",
    "PARQUE CLUBE GUARULHOS",
    "PARQUE DA CIDADE - PDC GLEBA B",
    "PARQUE DOS GIRASSOIS",
    "PARQUE FIRENZE",
    "PARTICOLARE",
    "PASSEIO DE ITANHATIM - EDIFICIO ITAMARACA",
    "PATIO IPIRANGA",
    "PAUL HARRIS",
    "PAULA",
    "PAULISTANO",
    "PAÇO DAS UNIVERSIDADE",
    "PERDIZES TOWERS II",
    "PERSONAL HOME ALTO DA LAPA",
    "PIAZZA DELLA FORTEZZA",
    "PIAZZA DI ROMA TROPICAL",
    "PIAZZA DI SPAGNA",
    "PIAZZA MORUMBI",
    "PIAZZA VERONA",
    "PIB",
    "PILOTIS",
    "PINHEIRO NETO ADVOGADOS - HUNGRIA",
    "PITANGUEIRAS II",
    "PLACE SAINT GERMAIN",
    "PLAENGE",
    "PLAENGE GAVIA",
    "PLANTÃO - PORTARIA DIGITAL",
    "PLATINUM TOWER",
    "PLATÔ PERDIZES",
    "PLAZA MAYOR",
    "PODIUM VILA LEOPOLDINA",
    "POEMA - GRANJA JULIETA",
    "POINT VILA YARA",
    "POLARIS",
    "PORT ROYAL II",
    "PORTAL DE DOCUMENTOS SA",
    "PORTAL DO MORUMBI / SHOPPING",
    "PORTALE MATTINO",
    "PORTE DE MONTMARTRE",
    "PORTO FINO",
    "PORTUGAL",
    "PORTUGAL 587",
    "PRACTICAL LIFE JARDIM PAULISTA",
    "PRACTICAL LIFE MORUMBI HILLS",
    "PRAÇA BUTANTA",
    "PRAÇA DANKMAR",
    "PRAÇA GRACILIANO RAMOS",
    "PRAÇA LION I",
    "PRAÇAS DA LAPA",
    "PRINCESS",
    "PRIVILEGE",
    "PRO SECURITY - BASE OESTE",
    "PRO SERVIÇOS",
    "PRO SERVIÇOS LONDRINA",
    "PRÍNCIPE BERNARDO",
    "PVN CORPORATE BOUTIQUE",
    "QUARTIER RESIDENCE",
    "QUELUZ VITA",
    "QUINTAS DA LAPA",
    "QUINTAS DO MORUMBI",
    "RESERVA ALTA VISTA",
    "RESERVA CERÂMICA",
    "RESERVA DA SERRA",
    "RESERVA LUIZA TOMASELLI",
    "RESIDENCIAL BERILO",
    "RESIDENCIAL ESPLANADA DO CHÁ",
    "RIO NEGRO",
    "RISKALLA LASKANI",
    "RIVIERA ITALIANA",
    "ROCHAVERA CORPORATE TOWERS",
    "ROCHDALE",
    "ROMEO LOVES JULIETA",
    "ROSSI IPIRANGA ONE",
    "ROYAL ALTO DO IPIRANGA",
    "ROYAL BOULEVARD",
    "ROYAL CENTER",
    "ROYAL FOREST RESIDENCE & RESORT",
    "ROYAL GATE",
    "ROYAL PARK",
    "ROYAL TENNIS RESIDENCE & RESORT",
    "RSVP",
    "SAINT ELIE",
    "SAINT LOUIS - MOEMA",
    "SAINT LOUIS_IPIRANGA",
    "SAINT MARTIN",
    "SAINT THOMAS",
    "SALUTE",
    "SAN DIEGO",
    "SAN DONATO",
    "SAN PAOLO",
    "SAN REGIS",
    "SAN REMO",
    "SANTA CLARA E SANTA INES",
    "SANTA ELISA E SANTA MARCELINA",
    "SANTORINI",
    "SAPHIR",
    "SCENÁRIO JARDIM PRUDÊNCIA",
    "SEE JARDIM PRUDÊNCIA",
    "SENSE VANGUARD",
    "SER VILA MADALENA",
    "SETIN INCORPORADORA",
    "SHOP DO PORTAL - HORT PORTAL",
    "SIDE ALTO DA BOA VISTA",
    "SIERRA LEOA",
    "SILVER TOWER",
    "SINTONIA IBIRAPUERA",
    "SINÉSIO",
    "SKY HOUSE",
    "SKY VIEW",
    "SMART HOME NOVA KLABIN",
    "SOBERANO",
    "SOLAR CARLOS DRUMOND",
    "SOLAR DE EVORA",
    "SOLAR DO PORTAL",
    "SOLAR POMPEIA",
    "SOLARES DE CIDADE JARDIM - VILA PAULISTANA",
    "SOLARIS CARAPICUÍBA - CONDOMINIO & LAZER",
    "SOMMA BROOKLIN",
    "SOUTH POINT",
    "SPAZIO 2222",
    "SPAZIO BLU",
    "SPAZIO DELL'ARTE",
    "SPAZIO SAN CONRADO",
    "SPAZIO SAN LUCA",
    "SPAZIO UNO",
    "SPAZIO VILLA LOBOS",
    "SPORT'S VILLAGE IPIRANGA",
    "STARK",
    "START JARDIM SUL",
    "STATION PARADA INGLESA",
    "STATION VILA MADALENA",
    "STAY AEROPORTO",
    "STAZ BARRA FUNDA",
    "STELLA SOLARIS - JD. MARAJOARA",
    "STELLATO",
    "STORIA IBIRAPUERA",
    "STUDIO PUÃ",
    "SUN LAKE",
    "SWEET PRIMAVERA",
    "TAMBORÉ 7",
    "TEG CORAZZA",
    "TELAR DESENVOLVIMENTO IMOBILIÁRIO",
    "TERO",
    "TERRA BRASILIS",
    "TERRARA",
    "TERRARA TORRES",
    "TERRAS CANAA",
    "TERRAZA DI RIMINI",
    "TERRAZA DI VERDI",
    "TERRAÇAS ALTO DA LAPA",
    "TERRAÇO BEACH PARQUE OSASCO",
    "TERRAÇO PAULISTANO",
    "TERRAÇO QUITAÚNA",
    "TERRAÇOS ALTO DA LAPA",
    "TERRAÇOS DAS AZALEIAS",
    "THE COLLECTION MADALENA",
    "THE CORNER",
    "THE FRAME",
    "THE HOUSE",
    "THE MACKINTOSH TOWER",
    "THE VIEW BROOKLIN",
    "THELMA",
    "THERA RESIDENCE",
    "TIME OFFICES",
    "TODAY BRIGADEIRO",
    "TODAY FARIA LIMA",
    "TODAY MOEMA",
    "TODAY PERDIZES",
    "TOLOUSE",
    "TONS DE TANGARÁ",
    "TOPIC JAGUARÉ",
    "TORRE PASSARELLI",
    "TORRE Z",
    "TRANSPORTADORA MONTEMORENSE LTDA",
    "TRIUNFO IPIRANGA",
    "TROT VILA MARIA",
    "TUMIARU",
    "TUTOIA CORPORATE TOWER",
    "UDINE SPECIAL LINE",
    "ULIVING STUDENT HOUSE - UNIDADE HIGIENÓPOLIS",
    "ULIVING STUDENT HOUSING - UNIDADE JARDINS",
    "UNICOM",
    "UNIK RESIDENCIAL",
    "UNIPAULISTANA",
    "UPPER SIDE",
    "UPPER WEST SIDE",
    "UPSIDE VILA PRUDENTE",
    "UPTOWN",
    "URBE",
    "URUPEMA",
    "VANGUARDA MORUMBI",
    "VARANDA PAULISTA",
    "VARANDAS DO PARQUE",
    "VENTANA",
    "VENTURA JARDIM PRUDENCIA",
    "VERDE MORUMBI",
    "VERO ENCANTO ITAQUERA",
    "VIA DEI GIARDINI",
    "VIA NAÇÕES",
    "VIA TUCURUVI",
    "VIBRA BUTANTÃ",
    "VICINO",
    "VIDA BELA",
    "VIDA VIVA VILA MARIA",
    "VIDI ELEVA CUPECÊ",
    "VIE VILA MARIANA",
    "VILA AZUL",
    "VILA BORGHESE - VILA SUZANA",
    "VILA DE OLINDA",
    "VILA EUROPA",
    "VILA NOVA LEOPOLDINA II",
    "VILA VERDE",
    "VILLA CONDOTTI VILLA VENETO",
    "VILLA DA VINCI",
    "VILLA DORIA",
    "VILLA FELICITA",
    "VILLA GIARDINO",
    "VILLA MONUMENTO",
    "VILLA VERDE",
    "VILLAGGIO DI CAPRI",
    "VILLAGIO BIANCO",
    "VILLAS DA GRANJA",
    "VISTA BARBARA",
    "VISTA CAMPO BELO STUDIOS",
    "VITA BOM RETIRO",
    "VITAL BRASIL",
    "VIVA BENX VILA LEOPOLDINA 1",
    "VIVA BENX VILA MARIANA",
    "VIVA CITTÁ",
    "VIVA RSF JAGUARIBE",
    "VIVAI MOEMA",
    "VIVAZ ESTAÇÃO SANTA MARINA",
    "VIVAZ PRIME VILA NOVA CACHOEIRINHA",
    "VIVENDA",
    "VIVIANE",
    "VIVID",
    "VIZ PONTE ESTAIADA",
    "VN OSCAR FREIRE",
    "WALK ALTO IPIRANGA",
    "WESSUM",
    "WEST SIDE BUILDING",
    "WORK STATION",
    "YBY IBIRAPUERA",
    "YBYRÁ",
    "YOU 180",
    "ZOOM VILA DAS BELEZAS"],
  responsaveisSugeridos: []               // nomes de pessoas agora vêm do histórico (quem já atuou)
};

/* Status: ordem oficial, classe visual, ícone, cor do gráfico e se é "aberto" (exige ação). */
const STATUS = [
  { cod: 'PENDENTE',              cls: 'pendente',    ico: 'relogio',      cor: '#E65100', aberto: true },
  { cod: 'EM TRATATIVA',          cls: 'tratativa',   ico: 'tratativa',    cor: '#1A3A6B', aberto: true },
  { cod: 'AGUARDANDO INFORMAÇÃO', cls: 'aguardando',  ico: 'interrogacao', cor: '#C49A00', aberto: true },
  { cod: 'CORRIGIDO',             cls: 'corrigido',   ico: 'check',        cor: '#2B7D2B', aberto: false },
  { cod: 'CANCELADO',             cls: 'cancelado',   ico: 'x',            cor: '#8C8C8C', aberto: false },
  { cod: 'DUPLICIDADE / VALIDAR', cls: 'duplicidade', ico: 'copia',        cor: '#DE262E', aberto: true }
];
const STATUS_MAP = Object.fromEntries(STATUS.map((s, i) => [s.cod, { ...s, ordem: i }]));

/* Campos editáveis (rótulo usado no histórico). */
const CAMPOS_EDITAVEIS = [
  ['supervisor', 'Supervisor'], ['gestao', 'Gestão'], ['cliente', 'Cliente/Contrato'],
  ['re', 'RE'], ['colaborador', 'Colaborador'], ['tipo', 'Tipo de correção'], ['dataOcorrencia', 'Data da ocorrência'],
  ['lancada', 'Informação lançada'], ['correta', 'Informação correta'], ['motivo', 'Motivo'],
  ['evidencia', 'Evidência'], ['observacao', 'Observação'], ['responsavel', 'Responsável']
];

/* --------------------------------------------------------------------------
   PERFIS E PERMISSÕES  (matriz única — ajuste aqui para mudar o que cada perfil pode)
   As permissões são verificadas em DOIS lugares: na interface (menus/botões/rotas) e,
   principalmente, na LÓGICA (Servico/Contas chamam Auth.exigir antes de qualquer ação).
   -------------------------------------------------------------------------- */
const PERFIS = {
  MESTRE:     { rotulo: 'MESTRE',     inicio: 'dashboard', desc: 'Acesso completo e administração dos acessos' },
  CCO:        { rotulo: 'CCO',        inicio: 'dashboard', desc: 'Visualização e tratativa das solicitações + Dashboard' },
  SUPERVISOR: { rotulo: 'SUPERVISOR', inicio: 'nova',      desc: 'Criação e acompanhamento das próprias solicitações' }
};
const PERMISSOES = {
  MESTRE: ['dashboard', 'indicadores', 'correcao.criar', 'correcao.ver', 'correcao.ver.todas', 'correcao.editar',
    'correcao.status', 'correcao.excluir', 'historico.ver', 'exportar', 'usuarios.admin', 'backup'],
  CCO: ['dashboard', 'indicadores', 'correcao.ver', 'correcao.ver.todas', 'correcao.status', 'historico.ver', 'exportar'],
  SUPERVISOR: ['correcao.criar', 'correcao.ver', 'correcao.editar.proprias']
};
/* Permissão exigida para abrir cada tela. */
const PERM_VIEW = {
  dashboard: 'dashboard', indicadores: 'indicadores', nova: 'correcao.criar', historico: 'historico.ver', usuarios: 'usuarios.admin',
  correcoes: 'correcao.ver', pendentes: 'correcao.ver.todas', tratativa: 'correcao.ver.todas', aguardando: 'correcao.ver.todas', corrigidos: 'correcao.ver.todas'
};
/* Contas iniciais (as senhas NÃO ficam no código: apenas sal + hash). Preenchido pelo build. */
const SEED_USUARIOS = [
  { login: 'MESTRE', perfil: 'MESTRE', sal: 'eeb320998a8bffcb11a96561d5c50335', hash: '3682629749298131aa63d94f88e5259a054f8ac1924d43ef86a23ac3a0d9d701' },
  { login: 'SUPERVISOR', perfil: 'SUPERVISOR', sal: 'b8ec01a6cab91834de4133cde09e273d', hash: 'fc327b67abe338670a18ea15561074fe9a28bfc4ee61c1505920b96fd7641d67' },
  { login: 'CCO', perfil: 'CCO', sal: 'ee4782ab00df6740f2b9db8904be2d0f', hash: 'd4e3bef78e10eaf23ebf981cd83ef0469b56cf02ba0c3e6d5b7b2b4a9a66aafd' }
];

/* ==========================================================================
   2. UTILITÁRIOS
   ========================================================================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
/* Normaliza para comparação: minúsculas, sem acento, espaços colapsados. */
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
const uid = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
const debounce = (fn, ms = 180) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

function hojeISO(d = new Date()) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function agoraISO() { return new Date().toISOString(); }
function dataValida(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return y >= 2000 && dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}
function fmtData(s) { if (!s) return '—'; const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; }
function fmtDataHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function addDias(iso, n) { const [y, m, d] = iso.split('-').map(Number); return hojeISO(new Date(y, m - 1, d + n)); }
function diasEntre(a, b) { // b - a, em dias (datas AAAA-MM-DD)
  const [y1, m1, d1] = a.split('-').map(Number), [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 864e5);
}
function fmtDuracao(ms) {
  if (ms == null || isNaN(ms)) return '—';
  const min = Math.max(0, Math.round(ms / 60000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ${pad(min % 60)} min`;
  return `${Math.floor(h / 24)} d ${h % 24} h`;
}
function idadeDias(rec) { return Math.floor((Date.now() - new Date(rec.criadoEm).getTime()) / 864e5); }
function ehAtrasada(rec) { return !!(STATUS_MAP[rec.status] && STATUS_MAP[rec.status].aberto && idadeDias(rec) > CONFIG.prazoAlertaDias); }
function unicos(arr) { return Array.from(new Set(arr.filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true })); }

/* Ícones (traços simples, sem dependências). */
const ICONES = {
  dashboard: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
  plus: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>',
  list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  relogio: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  tratativa: '<path d="M21 12a9 9 0 1 1-3-6.7"/><polyline points="21 3 21 9 15 9"/>',
  interrogacao: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  check: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  x: '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
  copia: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  grafico: '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
  historico: '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/><polyline points="12 7 12 12 15 14"/>',
  olho: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  editar: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
  trocar: '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  lixeira: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  busca: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  arquivo: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
  sair: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  usuarios: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  usuario: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  alerta: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  fechar: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'
};
const icone = n => `<span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false">${ICONES[n] || ''}</svg></span>`;

/* Selo de status: SEMPRE texto + ícone + cor (nunca só cor). */
function seloStatus(cod) {
  const s = STATUS_MAP[cod] || { cls: 'cancelado', ico: 'info' };
  return `<span class="st st-${s.cls}">${icone(s.ico)}${esc(cod)}</span>`;
}

/* ==========================================================================
   3. REPOSITÓRIO  (armazenamento)

   >>> INTEGRAÇÃO FUTURA <<<
   Esta é a ÚNICA camada que conhece o localStorage. Todo o restante do sistema
   fala apenas com estes métodos (todos assíncronos, prontos para uma API):

     carregar()                  -> { correcoes, historico, meta }
     salvarCorrecao(rec)         -> grava/atualiza 1 correção          (ex.: POST/PUT /correcoes)
     removerCorrecao(id)         -> remove 1 correção                  (ex.: DELETE /correcoes/:id)
     adicionarHistorico(itens)   -> acrescenta itens (append-only)     (ex.: POST /historico)
     proximoId()                 -> gera COR-000001, COR-000002...     (no servidor: sequência do banco)
     carregarUsuarios()/salvarUsuarios()   -> contas e perfis          (no servidor: tabela de usuários)
     carregarAuditoria()/adicionarAuditoria() -> registro de acessos
     substituirTudo(dados)       -> restauração de backup
     removerDemo()               -> apaga registros de demonstração

   Para usar API, Banco de dados, Microsoft Excel/SharePoint, Google Sheets ou sistema
   interno, reescreva SOMENTE o corpo destes métodos. Nenhuma integração externa está
   implementada nesta versão.

   >>> SEGURANÇA — LEIA <<<
   Nesta versão login, senha e permissões rodam NO NAVEGADOR. Isso organiza o uso e dá
   rastreabilidade, mas NÃO é uma barreira de segurança real: quem tiver acesso ao
   computador e conhecimento técnico (DevTools) pode ler/alterar o localStorage e o código.
   Para segurança real, autenticação e autorização (Auth/Contas/Servico) precisam
   ser executadas em um SERVIDOR, com senhas em bcrypt/argon2 e sessão por cookie/token.
   ========================================================================== */
const Repo = (() => {
  const P = CONFIG.prefixo;
  const CH = { correcoes: P + '.correcoes', historico: P + '.historico', meta: P + '.meta', usuarios: P + '.usuarios', auditoria: P + '.auditoria' };
  const mem = {};            // fallback em memória se o localStorage estiver indisponível
  let persistente = true;

  function ler(chave, padrao) {
    try {
      const v = window.localStorage.getItem(chave);
      return v === null ? padrao : JSON.parse(v);
    } catch (e) {
      persistente = false;
      return (chave in mem) ? JSON.parse(mem[chave]) : padrao;
    }
  }
  function gravar(chave, valor) {
    const s = JSON.stringify(valor);
    try { window.localStorage.setItem(chave, s); }
    catch (e) { persistente = false; mem[chave] = s; }
  }

  return {
    get persistente() { return persistente; },
    lerLocal: (k, p) => ler(P + '.local.' + k, p),
    gravarLocal: (k, v) => gravar(P + '.local.' + k, v),

    async carregar() {
      return {
        correcoes: ler(CH.correcoes, []),
        historico: ler(CH.historico, []),
        meta: ler(CH.meta, { seq: 0, demoInicializado: false })
      };
    },
    async salvarCorrecao(rec) {
      const lista = ler(CH.correcoes, []);
      const i = lista.findIndex(r => r.id === rec.id);
      if (i >= 0) lista[i] = rec; else lista.push(rec);
      gravar(CH.correcoes, lista);
    },
    async removerCorrecao(id) {
      gravar(CH.correcoes, ler(CH.correcoes, []).filter(r => r.id !== id));
    },
    async adicionarHistorico(itens) {
      const h = ler(CH.historico, []);
      itens.forEach(i => h.push(i));
      gravar(CH.historico, h);
    },
    async proximoId() {
      if (Sync.servidor) return Sync.novoId();      // modo servidor: ID único gerado na máquina (funciona sem internet)
      const meta = ler(CH.meta, { seq: 0, demoInicializado: false });
      meta.seq += 1;
      gravar(CH.meta, meta);
      return 'COR-' + String(meta.seq).padStart(6, '0');
    },
    async gravarMeta(patch) {
      const meta = { ...ler(CH.meta, { seq: 0, demoInicializado: false }), ...patch };
      gravar(CH.meta, meta);
      return meta;
    },
    async inserirLote(correcoes, historico) {  // usado pela carga de demonstração
      gravar(CH.correcoes, ler(CH.correcoes, []).concat(correcoes));
      gravar(CH.historico, ler(CH.historico, []).concat(historico));
    },
    async substituirTudo({ correcoes, historico, meta }) {
      gravar(CH.correcoes, correcoes);
      gravar(CH.historico, historico);
      gravar(CH.meta, meta);
    },
    async removerDemo() {
      const ids = new Set(ler(CH.correcoes, []).filter(r => r.demo).map(r => r.id));
      gravar(CH.correcoes, ler(CH.correcoes, []).filter(r => !r.demo));
      gravar(CH.historico, ler(CH.historico, []).filter(h => !ids.has(h.correcaoId)));
    },
    async carregarUsuarios() { return ler(CH.usuarios, []); },
    async salvarUsuarios(lista) { gravar(CH.usuarios, lista); },
    async carregarAuditoria() { return ler(CH.auditoria, []); },
    async substituirAuditoria(lista) { gravar(CH.auditoria, lista); },
    async adicionarAuditoria(e) {
      const a = ler(CH.auditoria, []); a.push(e);
      if (a.length > 3000) a.splice(0, a.length - 3000);
      gravar(CH.auditoria, a);
    },
    nomeBase: P
  };
})();

/* Dados em memória (cache), sincronizados com o Repo. */
const Dados = { correcoes: [], historico: [], meta: { seq: 0, demoInicializado: false }, usuarios: [], auditoria: [] };
async function carregarDados() {
  const d = await Repo.carregar();
  Dados.correcoes = d.correcoes; Dados.historico = d.historico; Dados.meta = d.meta;
  Dados.usuarios = await Repo.carregarUsuarios();
  Dados.auditoria = await Repo.carregarAuditoria();
}

/* Preferências de interface (filtros, rascunho, período). Separadas POR LOGIN neste navegador. */
const Prefs = {
  chave(k) { return CONFIG.prefixo + '.pref.' + (typeof Auth !== 'undefined' && Auth.login ? Auth.login + '.' : '') + k; },
  ler(k, padrao) { try { const v = localStorage.getItem(this.chave(k)); return v === null ? padrao : JSON.parse(v); } catch (e) { return padrao; } },
  gravar(k, v) { try { localStorage.setItem(this.chave(k), JSON.stringify(v)); } catch (e) { /* ignora */ } },
  apagar(k) { try { localStorage.removeItem(this.chave(k)); } catch (e) { /* ignora */ } }
};

/* ==========================================================================
   HASH DE SENHA  (SHA-256 + sal + rodadas; implementação própria, sem bibliotecas)
   Na versão com servidor, trocar por bcrypt/argon2 no backend.
   ========================================================================== */
/*HASH-BEGIN*/
const Hash = (() => {
  const primos = [];
  for (let n = 2; primos.length < 64; n++) if (primos.every(p => n % p)) primos.push(n);
  const frac = x => Math.floor((x - Math.floor(x)) * 4294967296);
  const K = primos.map(p => frac(Math.cbrt(p)));
  const H0 = primos.slice(0, 8).map(p => frac(Math.sqrt(p)));
  const ror = (x, n) => (x >>> n) | (x << (32 - n));
  function sha256(msg) {
    const l = msg.length, tam = ((l + 9 + 63) >> 6) << 6, buf = new Uint8Array(tam);
    buf.set(msg); buf[l] = 0x80;
    const v = new DataView(buf.buffer);
    v.setUint32(tam - 4, (l * 8) >>> 0); v.setUint32(tam - 8, Math.floor((l * 8) / 4294967296));
    const H = H0.slice(), w = new Uint32Array(64);
    for (let off = 0; off < tam; off += 64) {
      for (let i = 0; i < 16; i++) w[i] = v.getUint32(off + i * 4);
      for (let i = 16; i < 64; i++) {
        const s0 = ror(w[i - 15], 7) ^ ror(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = ror(w[i - 2], 17) ^ ror(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const S1 = ror(e, 6) ^ ror(e, 11) ^ ror(e, 25), ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
        const S0 = ror(a, 2) ^ ror(a, 13) ^ ror(a, 22), mj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + mj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      [a, b, c, d, e, f, g, h].forEach((x, i) => { H[i] = (H[i] + x) >>> 0; });
    }
    const out = new Uint8Array(32), ov = new DataView(out.buffer);
    H.forEach((x, i) => ov.setUint32(i * 4, x));
    return out;
  }
  const hex = b => Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
  function senha(s, sal, rodadas = CONFIG.hashRodadas) {
    const base = new TextEncoder().encode(sal + '|' + s);
    let h = sha256(base);
    for (let i = 1; i < rodadas; i++) { const b = new Uint8Array(32 + base.length); b.set(h); b.set(base, 32); h = sha256(b); }
    return hex(h);
  }
  function sal() { const a = new Uint8Array(16); crypto.getRandomValues(a); return hex(a); }
  return { sha256, hex, senha, sal };
})();
/*HASH-END*/

/* ==========================================================================
   AUTENTICAÇÃO E SESSÃO
   ========================================================================== */
const normLogin = l => String(l || '').trim().toUpperCase();

/* Valida o nome da PESSOA (contas são compartilhadas: nome digitado a cada ação). */
function validarPessoa(nome) {
  const n = String(nome || '').trim().replace(/\s+/g, ' ');
  if (n.length < 3) return 'Informe o nome da pessoa (mínimo 3 caracteres).';
  if (!/[A-Za-zÀ-ÿ]{2}/.test(n)) return 'Informe um nome válido.';
  const proibidos = [...Object.keys(PERFIS), ...Dados.usuarios.map(u => u.login)].map(norm);
  if (proibidos.includes(norm(n))) return 'Informe o NOME DA PESSOA que está realizando a ação, e não o login da conta.';
  return '';
}
const limparPessoa = n => String(n || '').trim().replace(/\s+/g, ' ');

const Auth = (() => {
  const SK = CONFIG.prefixo + '.sessao';
  let sessao = null;                 // { login, inicio }
  let ultima = Date.now();
  const registro = () => sessao ? (Dados.usuarios.find(u => u.login === sessao.login) || null) : null;
  const permsDe = u => (u && u.ativo) ? (PERMISSOES[u.perfil] || []) : [];

  const api = {
    get logado() { const u = registro(); return !!(u && u.ativo); },
    get login() { return sessao ? sessao.login : null; },
    get perfil() { const u = registro(); return u && u.ativo ? u.perfil : null; },
    pode(p) { return permsDe(registro()).includes(p); },
    /* Verificação na LÓGICA: lança erro (e registra a tentativa) quando o perfil não tem a permissão. */
    exigir(p) {
      if (!api.pode(p)) { api.auditar('ACESSO_NEGADO', 'Tentativa sem permissão: ' + p); throw new Error('ACESSO NEGADO: seu perfil não tem permissão para esta ação.'); }
    },
    negado(p) { api.auditar('ACESSO_NEGADO', 'Tentativa de acesso sem permissão: ' + p); },

    auditar(evento, detalhe = '', pessoa = '', loginForcado) {
      const e = { id: uid(), dataHora: agoraISO(), login: loginForcado || api.login || '', perfil: api.perfil || '', pessoa: pessoa || '', evento, detalhe };
      Dados.auditoria.push(e);
      Repo.adicionarAuditoria(e).catch(() => {});
    },

    async entrar(loginBruto, senha) {
      if (Sync.servidor) {                           // modo servidor: quem confere a senha é o servidor
        const r = await Sync.entrar(normLogin(loginBruto).slice(0, 30), senha);
        if (!r.ok) return r;
        sessao = { login: r.usuario.login, inicio: Date.now() }; ultima = Date.now();
        try { sessionStorage.setItem(SK, JSON.stringify(sessao)); } catch (e) { /* ignora */ }
        return { ok: true };
      }
      const login = normLogin(loginBruto).slice(0, 30);
      if (!login || !senha) return { ok: false, erro: 'Informe o login e a senha.' };
      const t = Repo.lerLocal('tentativas', {});
      const info = t[login] || { n: 0, ate: 0 };
      if (info.ate > Date.now()) return { ok: false, erro: `Acesso temporariamente bloqueado por excesso de tentativas. Tente novamente em ${Math.ceil((info.ate - Date.now()) / 60000)} min.` };
      const u = Dados.usuarios.find(x => x.login === login);
      const h = Hash.senha(senha, u ? u.sal : '0'.repeat(32));   // sempre calcula (tempo semelhante)
      if (!(u && u.ativo && h === u.hash)) {
        info.n += 1;
        if (info.n >= CONFIG.maxTentativas) { info.ate = Date.now() + CONFIG.bloqueioMinutos * 60000; info.n = 0; }
        t[login] = info; Repo.gravarLocal('tentativas', t);
        api.auditar('LOGIN_FALHA', u && !u.ativo ? 'Conta desativada' : 'Login ou senha inválidos', '', login);
        return { ok: false, erro: 'Login ou senha inválidos, ou conta desativada.' };
      }
      delete t[login]; Repo.gravarLocal('tentativas', t);
      sessao = { login, inicio: Date.now() }; ultima = Date.now();
      try { sessionStorage.setItem(SK, JSON.stringify(sessao)); } catch (e) { /* ignora */ }
      api.auditar('LOGIN', 'Acesso realizado');
      return { ok: true };
    },
    restaurar() {
      try {
        const s = JSON.parse(sessionStorage.getItem(SK) || 'null');
        const u = s && Dados.usuarios.find(x => x.login === s.login);
        if (u && u.ativo && (!Sync.servidor || Sync.temToken())) { sessao = s; ultima = Date.now(); return true; }
        sessionStorage.removeItem(SK);
      } catch (e) { /* ignora */ }
      return false;
    },
    sair(evento = 'LOGOUT', detalhe = '') {
      if (sessao) api.auditar(evento, detalhe);
      sessao = null;
      try { sessionStorage.removeItem(SK); } catch (e) { /* ignora */ }
    },
    tocar() { ultima = Date.now(); },
    expirou() { return !!sessao && (Date.now() - ultima) > CONFIG.sessaoMinutos * 60000; },
    /* A conta continua existindo e ativa? (ex.: o MESTRE pode ter desativado durante o uso) */
    valida() { const u = registro(); return !!(u && u.ativo); }
  };
  return api;
})();

/* ==========================================================================
   CONTAS (administração de acessos — somente MESTRE)
   ========================================================================== */
const Contas = (() => {
  const salvar = async () => { await Repo.salvarUsuarios(Dados.usuarios); };
  const publico = ({ hash, sal, ...r }) => r;
  function erroSenha(s, s2, login) {
    if (String(s || '').length < CONFIG.senhaMinimo) return `A senha deve ter pelo menos ${CONFIG.senhaMinimo} caracteres.`;
    if (s2 !== undefined && s !== s2) return 'A confirmação da senha não confere.';
    if (login && norm(s) === norm(login)) return 'A senha não pode ser igual ao login.';
    return '';
  }
  const mestresAtivos = (exceto) => Dados.usuarios.filter(u => u.perfil === 'MESTRE' && u.ativo && u.login !== exceto).length;
  function exigirPessoa(p) { const e = validarPessoa(p); if (e) throw new Error(e); return limparPessoa(p); }

  return {
    async semear() {                // cria as contas iniciais se ainda não existem
      if (Dados.usuarios.length) return;
      const agora = agoraISO();
      Dados.usuarios = SEED_USUARIOS.map(u => ({ ...u, ativo: true, descricao: PERFIS[u.perfil].desc, senhaPadrao: true,
        criadoEm: agora, criadoPor: 'Sistema (conta inicial)', atualizadoEm: agora, atualizadoPor: 'Sistema (conta inicial)' }));
      await salvar();
    },
    listar() { Auth.exigir('usuarios.admin'); return Dados.usuarios.map(publico); },
    async criar({ login, perfil, descricao, senha, senha2, pessoa }) {
      Auth.exigir('usuarios.admin');
      const p = exigirPessoa(pessoa), lg = normLogin(login);
      if (!/^[A-Z0-9_.-]{3,20}$/.test(lg)) throw new Error('Login inválido: use 3 a 20 caracteres (letras, números, ponto, hífen ou sublinhado).');
      if (Dados.usuarios.some(u => u.login === lg)) throw new Error('Já existe uma conta com este login.');
      if (!PERFIS[perfil]) throw new Error('Perfil inválido.');
      const es = erroSenha(senha, senha2, lg); if (es) throw new Error(es);
      const agora = agoraISO(), sal = Hash.sal();
      Dados.usuarios.push({ login: lg, perfil, ativo: true, descricao: String(descricao || '').trim(), sal, hash: Hash.senha(senha, sal), senhaPadrao: false,
        criadoEm: agora, criadoPor: p, atualizadoEm: agora, atualizadoPor: p });
      await salvar(); Auth.auditar('CONTA_CRIADA', `${lg} (${perfil})`, p);
    },
    async editar(login, { perfil, descricao, pessoa }) {
      Auth.exigir('usuarios.admin');
      const p = exigirPessoa(pessoa), u = Dados.usuarios.find(x => x.login === login);
      if (!u) throw new Error('Conta não encontrada.');
      if (!PERFIS[perfil]) throw new Error('Perfil inválido.');
      if (u.perfil === 'MESTRE' && perfil !== 'MESTRE' && u.ativo && mestresAtivos(u.login) === 0) throw new Error('Não é possível alterar o nível da única conta MESTRE ativa.');
      if (u.login === Auth.login && perfil !== u.perfil) throw new Error('Você não pode alterar o nível da conta que está em uso.');
      const antes = `${u.perfil}`; u.perfil = perfil; u.descricao = String(descricao || '').trim();
      u.atualizadoEm = agoraISO(); u.atualizadoPor = p;
      await salvar(); Auth.auditar('CONTA_EDITADA', `${login}: nível ${antes} -> ${perfil}`, p);
    },
    async definirAtivo(login, ativo, pessoa) {
      Auth.exigir('usuarios.admin');
      const p = exigirPessoa(pessoa), u = Dados.usuarios.find(x => x.login === login);
      if (!u) throw new Error('Conta não encontrada.');
      if (!ativo && u.login === Auth.login) throw new Error('Você não pode desativar a conta que está em uso.');
      if (!ativo && u.perfil === 'MESTRE' && u.ativo && mestresAtivos(u.login) === 0) throw new Error('Não é possível desativar a única conta MESTRE ativa.');
      u.ativo = !!ativo; u.atualizadoEm = agoraISO(); u.atualizadoPor = p;
      await salvar(); Auth.auditar(ativo ? 'CONTA_ATIVADA' : 'CONTA_DESATIVADA', login, p);
    },
    async redefinirSenha(login, senha, senha2, pessoa) {
      Auth.exigir('usuarios.admin');
      const p = exigirPessoa(pessoa), u = Dados.usuarios.find(x => x.login === login);
      if (!u) throw new Error('Conta não encontrada.');
      const es = erroSenha(senha, senha2, login); if (es) throw new Error(es);
      u.sal = Hash.sal(); u.hash = Hash.senha(senha, u.sal); u.senhaPadrao = false; u.atualizadoEm = agoraISO(); u.atualizadoPor = p;
      await salvar(); Auth.auditar('SENHA_REDEFINIDA', login, p);
      const t = Repo.lerLocal('tentativas', {}); delete t[login]; Repo.gravarLocal('tentativas', t);
    },
    auditoria(limite = 150) { Auth.exigir('usuarios.admin'); return Dados.auditoria.slice(-limite).reverse(); }
  };
})();

/* ==========================================================================
   4. SERVIÇO  (regras de negócio + PERMISSÕES)
   Toda operação exige permissão (Auth.exigir) e as consultas devolvem só o que o perfil pode ver:
     MESTRE / CCO  -> todas as solicitações
     SUPERVISOR    -> apenas as solicitações registradas por contas de perfil SUPERVISOR
   Cada ação exige o NOME DA PESSOA (contas compartilhadas), gravado no histórico junto com
   login, perfil, data e hora.
   ========================================================================== */
const Servico = (() => {
  const idxBusca = new WeakMap();
  const STATUS_EDITAVEL_SUPERVISOR = ['PENDENTE', 'AGUARDANDO INFORMAÇÃO', 'DUPLICIDADE / VALIDAR'];

  /* ---- escopo de visualização ---- */
  const visivel = r => Auth.pode('correcao.ver') && (Auth.pode('correcao.ver.todas') || r.criadoPerfil === 'SUPERVISOR');
  const listar = () => !Auth.pode('correcao.ver') ? [] : Auth.pode('correcao.ver.todas') ? Dados.correcoes : Dados.correcoes.filter(visivel);
  const obter = id => { const r = Dados.correcoes.find(x => x.id === id); return r && visivel(r) ? r : null; };
  function exigirRegistro(id) {
    const r = obter(id);
    if (!r) { Auth.negado('registro:' + id); throw new Error('Registro não encontrado ou sem permissão de acesso.'); }
    return r;
  }
  function historicoDe(id) {
    const r = Dados.correcoes.find(x => x.id === id);
    if (r ? !visivel(r) : !Auth.pode('historico.ver')) return [];
    return Dados.historico.filter(h => h.correcaoId === id).sort((a, b) => b.dataHora.localeCompare(a.dataHora));
  }
  function historicoGeral() { Auth.exigir('historico.ver'); return Dados.historico; }
  const pessoasConhecidas = () => unicos(Dados.historico.filter(h => h.perfil === Auth.perfil && h.usuario).map(h => h.usuario));

  function novoHist(correcaoId, acao, campos, comentario, pessoa, extra = {}) {
    return { id: uid(), correcaoId, dataHora: agoraISO(), usuario: pessoa, login: Auth.login, perfil: Auth.perfil, acao, campos, comentario: comentario || '', ...extra };
  }
  async function gravarHist(itens) { await Repo.adicionarHistorico(itens); itens.forEach(i => Dados.historico.push(i)); }
  function atualizarCache(rec) {
    const i = Dados.correcoes.findIndex(r => r.id === rec.id);
    if (i >= 0) Dados.correcoes[i] = rec; else Dados.correcoes.push(rec);
  }
  /* Reaproveita a grafia já existente (evita "Cliente X" e "cliente x" como itens diferentes). */
  function canonico(campo, valor) {
    const v = String(valor || '').trim().replace(/\s+/g, ' ');
    const achado = Dados.correcoes.find(r => norm(r[campo]) === norm(v));
    return achado ? achado[campo] : v;
  }
  function limparDados(d) {
    return {
      data: String(d.data || '').trim(),
      supervisor: canonico('supervisor', d.supervisor),
      gestao: String(d.gestao || '').trim(),
      cliente: canonico('cliente', d.cliente),
      re: String(d.re || '').replace(/\D/g, ''),
      colaborador: String(d.colaborador || '').trim().replace(/\s+/g, ' '),
      tipo: String(d.tipo || '').trim(),
      dataOcorrencia: String(d.dataOcorrencia || '').trim(),
      lancada: String(d.lancada || '').trim(),
      correta: String(d.correta || '').trim(),
      motivo: String(d.motivo || '').trim(),
      evidencia: String(d.evidencia || '').trim(),
      observacao: String(d.observacao || '').trim(),
      responsavel: limparPessoa(d.responsavel),
      solicitante: limparPessoa(d.solicitante),
      pessoa: limparPessoa(d.pessoa),
      motivoAlt: String(d.motivoAlt || '').trim()
    };
  }

  /* ---- duplicidades e conflitos ---- */
  /* Possível duplicidade: mesmo colaborador (RE ou nome) + mesmo cliente + mesma data da ocorrência.
     A busca considera TODOS os registros, mas só devolve IDs que o perfil pode ver. */
  function buscarDuplicidades(d, ignorarId = null) {
    return Dados.correcoes.filter(r =>
      r.id !== ignorarId && r.status !== 'CANCELADO' &&
      norm(r.cliente) === norm(d.cliente) && r.dataOcorrencia === d.dataOcorrencia &&
      (r.re === String(d.re).replace(/\D/g, '') || norm(r.colaborador) === norm(d.colaborador)));
  }
  function buscarConflitos(d, ignorarId = null) {
    const re = String(d.re).replace(/\D/g, ''), base = listar().filter(r => r.id !== ignorarId), out = [];
    const mesmoRe = base.filter(r => r.re === re && norm(r.colaborador) !== norm(d.colaborador));
    if (mesmoRe.length) out.push({ tipo: 'conflito_re', ids: mesmoRe.map(r => r.id),
      msg: `O RE ${re} já consta para "${mesmoRe[0].colaborador}" (${mesmoRe[0].id}). Confirme se o RE e o nome do colaborador estão corretos.` });
    const mesmoNome = base.filter(r => norm(r.colaborador) === norm(d.colaborador) && r.re !== re);
    if (mesmoNome.length) out.push({ tipo: 'conflito_nome', ids: mesmoNome.map(r => r.id),
      msg: `O colaborador "${d.colaborador}" já consta com o RE ${mesmoNome[0].re} (${mesmoNome[0].id}). Confirme o RE informado.` });
    return out;
  }

  /* ---- validação: { erros:{campo:msg}, avisos:[{tipo,msg,ids}], dados } ---- */
  function validar(bruto, { ignorarId = null, modo = 'novo' } = {}) {
    const d = limparDados(bruto);
    if (modo === 'novo') d.data = hojeISO();   // data da solicitação: sempre hoje
    else if (ignorarId) { const o = Dados.correcoes.find(r => r.id === ignorarId); if (o) d.data = o.data; }
    const erros = {}, avisos = [];
    const obrig = {
      data: 'Informe a data da solicitação.', supervisor: 'Informe o supervisor.', gestao: 'Selecione a gestão.',
      cliente: 'Informe o cliente/contrato.', re: 'Informe o RE.', colaborador: 'Informe o nome do colaborador.',
      tipo: 'Selecione o tipo de correção.', dataOcorrencia: 'Informe a data da ocorrência.',
      lancada: 'Informe a informação que foi lançada.', correta: 'Informe a informação correta.', motivo: 'Informe o motivo da correção.'
    };
    Object.keys(obrig).forEach(k => { if (!d[k]) erros[k] = obrig[k]; });

    if (modo === 'novo') { const e = validarPessoa(d.solicitante); if (e) erros.solicitante = e; }
    if (modo === 'edicao') {
      const e = validarPessoa(d.pessoa); if (e) erros.pessoa = e;
      if (!d.motivoAlt) erros.motivoAlt = 'Informe o motivo da alteração.';
    }
    if (!erros.re && !CONFIG.reRegex.test(d.re)) erros.re = 'RE inválido. ' + CONFIG.reDica;
    if (!erros.re && String(bruto.re || '').trim() && /[^\d\s.\-]/.test(String(bruto.re))) erros.re = 'RE inválido: use somente números.';
    if (!erros.supervisor) {
      const ofi = CONFIG.supervisoresLista.find(x => norm(x) === norm(d.supervisor));
      if (ofi) d.supervisor = ofi;
      else if (modo === 'novo' || !(Dados.correcoes.find(r => r.id === ignorarId) || {}).supervisor || norm(Dados.correcoes.find(r => r.id === ignorarId).supervisor) !== norm(d.supervisor)) erros.supervisor = 'Escolha o supervisor / sub área na lista.';
    }
    if (!erros.gestao && !CONFIG.gestoes.includes(d.gestao)) erros.gestao = 'Gestão inválida.';
    if (!erros.tipo && !CONFIG.tipos.includes(d.tipo)) erros.tipo = 'Tipo de correção inválido.';
    if (!erros.colaborador && d.colaborador.length < 3) erros.colaborador = 'Nome do colaborador muito curto.';
    if (!erros.cliente && d.cliente.length < 3) erros.cliente = 'Nome do cliente/contrato muito curto.';
    if (!erros.motivo && d.motivo.length < 5) erros.motivo = 'Descreva o motivo com um pouco mais de detalhe (mín. 5 caracteres).';

    const hoje = hojeISO();
    if (!erros.data) {
      if (!dataValida(d.data)) erros.data = 'Data da solicitação inválida.';
      else if (d.data > hoje) erros.data = 'A data da solicitação não pode ser futura.';
    }
    if (!erros.dataOcorrencia) {
      if (!dataValida(d.dataOcorrencia)) erros.dataOcorrencia = 'Data da ocorrência inválida.';
      else if (d.dataOcorrencia > hoje) erros.dataOcorrencia = 'A data da ocorrência não pode ser futura.';
      else if (!erros.data && d.dataOcorrencia > d.data) erros.dataOcorrencia = 'A data da ocorrência não pode ser posterior à data da solicitação.';
      else if (diasEntre(d.dataOcorrencia, hoje) > CONFIG.diasAlertaOcorrencia) {
        avisos.push({ tipo: 'ocorrencia_antiga', ids: [],
          msg: `A ocorrência é de ${fmtData(d.dataOcorrencia)} (há mais de ${CONFIG.diasAlertaOcorrencia} dias). Confirme a data antes de continuar.` });
      }
    }
    if (!erros.lancada && !erros.correta && norm(d.lancada) === norm(d.correta)) {
      erros.correta = 'Informação conflitante: a informação correta é igual à lançada. Ajuste um dos campos.';
    }
    if (!erros.re && !erros.colaborador && !erros.cliente && !erros.dataOcorrencia) {
      const dups = buscarDuplicidades(d, ignorarId);
      if (dups.length) avisos.push({ tipo: 'duplicidade', ids: dups.filter(visivel).map(r => r.id),
        msg: 'ATENÇÃO: Foi identificada uma possível solicitação duplicada para este colaborador, cliente e data. Verifique antes de continuar.' });
      buscarConflitos(d, ignorarId).forEach(c => avisos.push(c));
    }
    return { erros, avisos, dados: d };
  }

  /* ---- criação ---- */
  async function criar(bruto, { confirmado = false } = {}) {
    Auth.exigir('correcao.criar');
    const v = validar(bruto, { modo: 'novo' });
    const msgs = Object.values(v.erros);
    if (msgs.length) throw new Error('Dados inválidos: ' + msgs[0]);
    if (v.avisos.length && !confirmado) throw new Error('Existem avisos que precisam de confirmação antes de salvar.');
    const dup = v.avisos.find(a => a.tipo === 'duplicidade');
    const d = v.dados, id = await Repo.proximoId(), agora = agoraISO();
    d.data = hojeISO();                       // data da solicitação é sempre a de hoje (não editável)
    const rec = {
      id, data: d.data, supervisor: d.supervisor, gestao: d.gestao, cliente: d.cliente, re: d.re, colaborador: d.colaborador, tipo: d.tipo,
      dataOcorrencia: d.dataOcorrencia, lancada: d.lancada, correta: d.correta, motivo: d.motivo, evidencia: d.evidencia, observacao: d.observacao,
      status: dup ? 'DUPLICIDADE / VALIDAR' : 'PENDENTE', responsavel: '', correcaoRealizada: '', corrigidoPor: '',
      solicitante: d.solicitante, criadoLogin: Auth.login, criadoPerfil: Auth.perfil,
      criadoEm: agora, criadoPor: d.solicitante, atualizadoEm: agora, atualizadoPor: d.solicitante, concluidoEm: null, demo: false
    };
    const h = novoHist(id, 'CRIAÇÃO', [{ campo: 'Status', de: '', para: rec.status }],
      dup ? 'Registrada com alerta de possível duplicidade' + (dup.ids.length ? ` (${dup.ids.join(', ')})` : '') + '.' : '', d.solicitante);
    await Repo.salvarCorrecao(rec);
    await gravarHist([h]);
    atualizarCache(rec);
    return rec;
  }

  /* ---- edição: mantém o ID e grava o valor anterior no histórico ---- */
  function podeEditar(rec) {
    if (!rec || !visivel(rec)) return false;
    if (Auth.pode('correcao.editar')) return true;
    return Auth.pode('correcao.editar.proprias') && STATUS_EDITAVEL_SUPERVISOR.includes(rec.status);
  }
  async function editar(id, bruto) {
    const atual = exigirRegistro(id);
    if (!podeEditar(atual)) { Auth.negado('correcao.editar'); throw new Error('ACESSO NEGADO: seu perfil não pode editar esta solicitação.'); }
    const v = validar(bruto, { ignorarId: id, modo: 'edicao' });
    const msgs = Object.values(v.erros);
    if (msgs.length) throw new Error('Dados inválidos: ' + msgs[0]);
    const d = v.dados, mestre = Auth.pode('correcao.editar');
    const upd = { ...atual }, campos = [];
    CAMPOS_EDITAVEIS.forEach(([k, rot]) => {
      if (k === 'responsavel' && !mestre) return;             // supervisor não altera a tratativa
      const a = String(atual[k] ?? ''), b = String(d[k] ?? '');
      if (a !== b) { campos.push({ campo: rot, de: a, para: b }); upd[k] = b; }
    });
    let comentario = d.motivoAlt;
    if (!mestre && atual.status === 'AGUARDANDO INFORMAÇÃO') {   // solicitante complementou a informação pedida
      campos.push({ campo: 'Status', de: atual.status, para: 'PENDENTE' }); upd.status = 'PENDENTE';
      comentario += ' [informação complementada pelo solicitante; retornou para PENDENTE]';
    }
    if (!campos.length) return { alterado: false, rec: atual };
    upd.atualizadoEm = agoraISO(); upd.atualizadoPor = d.pessoa;
    await Repo.salvarCorrecao(upd);
    await gravarHist([novoHist(id, 'EDIÇÃO', campos, comentario, d.pessoa)]);
    atualizarCache(upd);
    return { alterado: true, rec: upd, campos };
  }

  /* ---- alteração de status / registro da correção (CCO e MESTRE) ---- */
  async function alterarStatus(id, novoStatus, { responsavel = '', comentario = '', correcaoRealizada = '' } = {}) {
    Auth.exigir('correcao.status');
    const atual = exigirRegistro(id);
    if (!STATUS_MAP[novoStatus]) throw new Error('Status inválido.');
    const ep = validarPessoa(responsavel); if (ep) throw new Error('Responsável pela correção: ' + ep);
    const pessoa = limparPessoa(responsavel), com = String(comentario || '').trim(), feito = String(correcaoRealizada || '').trim();
    const reabrindo = ['CORRIGIDO', 'CANCELADO'].includes(atual.status) && novoStatus !== atual.status;
    if (novoStatus === 'CORRIGIDO' && feito.length < 5) throw new Error('Registre o que foi corrigido (mín. 5 caracteres).');
    if (['CANCELADO', 'AGUARDANDO INFORMAÇÃO'].includes(novoStatus) && !com) throw new Error('Informe o comentário para este status.');
    if (reabrindo && !com) throw new Error('Informe o motivo da reabertura.');
    const agora = agoraISO(), upd = { ...atual, status: novoStatus, atualizadoEm: agora, atualizadoPor: pessoa };
    const campos = [];
    if (atual.status !== novoStatus) campos.push({ campo: 'Status', de: atual.status, para: novoStatus });
    if (pessoa !== (atual.responsavel || '')) { campos.push({ campo: 'Responsável', de: atual.responsavel || '', para: pessoa }); upd.responsavel = pessoa; }
    if (novoStatus === 'CORRIGIDO') {
      upd.concluidoEm = atual.concluidoEm || agora; upd.corrigidoPor = pessoa;
      if (feito !== (atual.correcaoRealizada || '')) { campos.push({ campo: 'O que foi corrigido', de: atual.correcaoRealizada || '', para: feito }); upd.correcaoRealizada = feito; }
    } else { upd.concluidoEm = null; upd.corrigidoPor = ''; upd.correcaoRealizada = ''; }
    if (!campos.length) return { alterado: false, rec: atual };
    await Repo.salvarCorrecao(upd);
    await gravarHist([novoHist(id, atual.status !== novoStatus ? 'ALTERAÇÃO DE STATUS' : 'ALTERAÇÃO DE TRATATIVA', campos, com, pessoa)]);
    atualizarCache(upd);
    return { alterado: true, rec: upd };
  }

  /* ---- exclusão: só MESTRE, só nos status permitidos; o histórico permanece com cópia dos dados ---- */
  const podeExcluir = rec => Auth.pode('correcao.excluir') && visivel(rec) && CONFIG.statusPermiteExcluir.includes(rec.status);
  async function excluir(id, motivo, pessoaBruta) {
    Auth.exigir('correcao.excluir');
    const atual = exigirRegistro(id);
    if (!CONFIG.statusPermiteExcluir.includes(atual.status)) throw new Error('Exclusão não permitida para o status ' + atual.status + '. Use CANCELADO.');
    const ep = validarPessoa(pessoaBruta); if (ep) throw new Error(ep);
    if (String(motivo || '').trim().length < 5) throw new Error('Informe o motivo da exclusão (mín. 5 caracteres).');
    const pessoa = limparPessoa(pessoaBruta);
    const h = novoHist(id, 'EXCLUSÃO', [{ campo: 'Status', de: atual.status, para: '(excluído)' }], motivo, pessoa, { snapshot: atual });
    await gravarHist([h]);
    await Repo.removerCorrecao(id);
    Dados.correcoes = Dados.correcoes.filter(r => r.id !== id);
  }

  /* ---- migração de registros antigos (versão sem login) ---- */
  async function migrar() {
    let n = 0;
    for (const r of Dados.correcoes) {
      let mudou = false;
      if (!r.criadoPerfil) { r.criadoPerfil = 'SUPERVISOR'; r.criadoLogin = r.criadoLogin || 'SUPERVISOR'; mudou = true; }
      if (r.solicitante === undefined) { r.solicitante = r.criadoPor || ''; mudou = true; }
      if (r.correcaoRealizada === undefined) { r.correcaoRealizada = ''; r.corrigidoPor = ''; mudou = true; }
      if (mudou) { await Repo.salvarCorrecao(r); n++; }
    }
    return n;
  }

  /* ---- filtro combinável ---- */
  function textoBusca(r) {
    let t = idxBusca.get(r);
    if (t === undefined) {
      t = norm([r.id, r.supervisor, r.gestao, r.cliente, r.re, r.colaborador, r.tipo, r.status, r.responsavel, r.solicitante,
        r.lancada, r.correta, r.motivo, r.evidencia, r.observacao, r.correcaoRealizada].join(' | '));
      idxBusca.set(r, t);
    }
    return t;
  }
  function filtrar(lista, f) {
    const termos = norm(f.q || '').split(' ').filter(Boolean);
    const fCli = norm(f.cliente || ''), fCol = norm(f.colaborador || ''), fRe = String(f.re || '').replace(/\D/g, '');
    return lista.filter(r => {
      if (f.de && r.data < f.de) return false;
      if (f.ate && r.data > f.ate) return false;
      if (f.supervisor && r.supervisor !== f.supervisor) return false;
      if (f.gestao && r.gestao !== f.gestao) return false;
      if (f.tipo && r.tipo !== f.tipo) return false;
      if (f.status && r.status !== f.status) return false;
      if (f.solicitante && r.solicitante !== f.solicitante) return false;
      if (f.responsavel) {
        if (f.responsavel === '__SEM__') { if (r.responsavel) return false; }
        else if (r.responsavel !== f.responsavel) return false;
      }
      if (fCli && !norm(r.cliente).includes(fCli)) return false;
      if (fCol && !norm(r.colaborador).includes(fCol)) return false;
      if (fRe && !r.re.includes(fRe)) return false;
      if (termos.length) { const t = textoBusca(r); if (!termos.every(x => t.includes(x))) return false; }
      return true;
    });
  }
  const COMPARADORES = {
    id: (a, b) => a.criadoEm.localeCompare(b.criadoEm),
    status: (a, b) => STATUS_MAP[a.status].ordem - STATUS_MAP[b.status].ordem,
    re: (a, b) => a.re.localeCompare(b.re, 'pt-BR', { numeric: true })
  };
  function ordenar(lista, campo, dir) {
    const cmp = COMPARADORES[campo] || ((a, b) => String(a[campo] ?? '').localeCompare(String(b[campo] ?? ''), 'pt-BR', { numeric: true, sensitivity: 'base' }));
    const f = dir === 'desc' ? -1 : 1;
    return lista.slice().sort((a, b) => f * cmp(a, b) || b.criadoEm.localeCompare(a.criadoEm));
  }

  /* ---- indicadores ---- */
  function contar(lista, campo) {
    const m = new Map();
    lista.forEach(r => m.set(r[campo], (m.get(r[campo]) || 0) + 1));
    return Array.from(m, ([rotulo, valor]) => ({ rotulo, valor })).sort((a, b) => b.valor - a.valor || String(a.rotulo).localeCompare(String(b.rotulo), 'pt-BR'));
  }
  function tempoMedio(lista) { // média (ms) entre criação e conclusão dos CORRIGIDOS
    const t = lista.filter(r => r.status === 'CORRIGIDO' && r.concluidoEm).map(r => new Date(r.concluidoEm) - new Date(r.criadoEm)).filter(x => x >= 0);
    return t.length ? { ms: t.reduce((a, b) => a + b, 0) / t.length, n: t.length } : { ms: null, n: 0 };
  }
  function resumoStatus(lista) {
    const c = Object.fromEntries(STATUS.map(s => [s.cod, 0]));
    lista.forEach(r => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }
  /* Detecta problemas nos dados já gravados (duplicidades, RE x nome, campos conflitantes). */
  function diagnosticos() {
    Auth.exigir('indicadores');
    const base = listar(), ativos = base.filter(r => r.status !== 'CANCELADO');
    const grupos = new Map();
    ativos.forEach(r => {
      const k = [r.re, norm(r.cliente), r.dataOcorrencia].join('|');
      if (!grupos.has(k)) grupos.set(k, []);
      grupos.get(k).push(r);
    });
    const duplicidades = Array.from(grupos.values()).filter(g => g.length > 1);
    const porRe = new Map();
    base.forEach(r => { if (!porRe.has(r.re)) porRe.set(r.re, []); porRe.get(r.re).push(r); });
    const reDivergente = Array.from(porRe.entries())
      .map(([re, regs]) => ({ re, regs, nomes: unicos(regs.map(r => r.colaborador)) }))
      .filter(x => new Set(x.regs.map(r => norm(r.colaborador))).size > 1);
    const inconsistentes = [];
    base.forEach(r => {
      if (norm(r.lancada) === norm(r.correta)) inconsistentes.push({ rec: r, problema: 'Informação lançada igual à correta' });
      if (r.dataOcorrencia > r.data) inconsistentes.push({ rec: r, problema: 'Ocorrência posterior à data da solicitação' });
      if (!CONFIG.reRegex.test(r.re)) inconsistentes.push({ rec: r, problema: 'RE fora do formato' });
    });
    return { duplicidades, reDivergente, inconsistentes, aguardandoValidar: base.filter(r => r.status === 'DUPLICIDADE / VALIDAR') };
  }

  return { listar, obter, historicoDe, historicoGeral, pessoasConhecidas, validar, criar, editar, alterarStatus, podeEditar, podeExcluir, excluir,
    migrar, filtrar, ordenar, contar, tempoMedio, resumoStatus, diagnosticos };
})();

/* ==========================================================================
   5. INTERFACE BASE: toast, modal, confirmação
   ========================================================================== */
function toast(msg, tipo = 'ok', { acao, textoAcao, duracao } = {}) {
  const box = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast toast-' + tipo;
  el.setAttribute('role', tipo === 'erro' ? 'alert' : 'status');
  el.innerHTML = `<span class="t-msg">${esc(msg)}${acao ? ` <button type="button" class="link-btn t-acao">${esc(textoAcao || 'Abrir')}</button>` : ''}</span>
    <button type="button" class="t-fechar" aria-label="Fechar mensagem">✕</button>`;
  const fechar = () => el.remove();
  $('.t-fechar', el).onclick = fechar;
  if (acao) $('.t-acao', el).onclick = () => { acao(); fechar(); };
  box.appendChild(el);
  const ms = duracao ?? (tipo === 'erro' ? 9000 : 6000);
  if (ms > 0) setTimeout(fechar, ms);
}

const Modal = (() => {
  const pilha = [];
  let n = 0;
  function abrir({ titulo, tituloHTML, corpo, rodape = '', largura = '640px', fecharNoFundo = true, aoFechar }) {
    const anterior = document.activeElement;
    const id = 'mt-' + (++n);
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="${id}" style="max-width:${largura}">
      <div class="modal-head"><h2 id="${id}">${tituloHTML || esc(titulo)}</h2>
        <button type="button" class="btn-ico" data-fechar aria-label="Fechar">${icone('fechar')}</button></div>
      <div class="modal-body">${corpo}</div><div class="modal-foot">${rodape}</div></div>`;
    $('#modal-root').appendChild(overlay);
    const api = {
      el: overlay.firstElementChild,
      fechar() {
        const i = pilha.indexOf(api); if (i >= 0) pilha.splice(i, 1);
        overlay.remove();
        if (anterior && document.contains(anterior)) anterior.focus();
        if (aoFechar) aoFechar();
      }
    };
    overlay.addEventListener('mousedown', e => { if (e.target === overlay && fecharNoFundo) api.fechar(); });
    $('[data-fechar]', overlay).onclick = () => api.fechar();
    pilha.push(api);
    const foco = $('[data-foco]', overlay) || $('input:not([type=hidden]), select, textarea', api.el) || $('button.btn-primary', api.el) || $('.modal-head button', overlay);
    if (foco) foco.focus();
    return api;
  }
  document.addEventListener('keydown', e => {
    if (!pilha.length) return;
    const topo = pilha[pilha.length - 1];
    if (e.key === 'Escape') { e.preventDefault(); topo.fechar(); return; }
    if (e.key === 'Tab') { // mantém o foco dentro do modal
      const f = $$('button:not([disabled]), input:not([disabled]), select, textarea, a[href], [tabindex]:not([tabindex="-1"])', topo.el).filter(x => x.offsetParent !== null);
      if (!f.length) return;
      const p = f[0], u = f[f.length - 1];
      if (e.shiftKey && document.activeElement === p) { e.preventDefault(); u.focus(); }
      else if (!e.shiftKey && document.activeElement === u) { e.preventDefault(); p.focus(); }
    }
  });
  return { abrir, get aberto() { return pilha.length > 0; }, fecharTodos() { while (pilha.length) pilha[pilha.length - 1].fechar(); } };
})();

/* Confirmação de ações críticas. Retorna Promise<boolean>. */
function confirmar({ titulo, mensagemHTML, textoConfirmar = 'Confirmar', textoCancelar = 'Cancelar', perigo = false }) {
  return new Promise(resolve => {
    let resolvido = false;
    const fim = v => { if (!resolvido) { resolvido = true; resolve(v); } };
    const m = Modal.abrir({
      titulo, corpo: `<div>${mensagemHTML}</div>`, largura: '520px', fecharNoFundo: false, aoFechar: () => fim(false),
      rodape: `<button type="button" class="btn" data-nao>${esc(textoCancelar)}</button>
               <button type="button" class="btn ${perigo ? 'btn-danger' : 'btn-primary'}" data-sim data-foco>${esc(textoConfirmar)}</button>`
    });
    $('[data-nao]', m.el).onclick = () => m.fechar();
    $('[data-sim]', m.el).onclick = () => { fim(true); m.fechar(); };
  });
}

/* Dica flutuante para gráficos (hover/foco). */
const Dica = {
  el: null,
  mostrar(texto, x, y) {
    if (!this.el) { this.el = document.createElement('div'); this.el.className = 'tooltip-graf'; document.body.appendChild(this.el); }
    this.el.textContent = texto; this.el.style.display = 'block';
    this.el.style.left = Math.min(x + 12, window.innerWidth - 270) + 'px'; this.el.style.top = (y + 14) + 'px';
  },
  ocultar() { if (this.el) this.el.style.display = 'none'; }
};
document.addEventListener('mouseover', e => {
  const t = e.target.closest && e.target.closest('[data-dica]');
  if (t) Dica.mostrar(t.getAttribute('data-dica'), e.clientX, e.clientY); else Dica.ocultar();
});
document.addEventListener('mousemove', e => { if (Dica.el && Dica.el.style.display === 'block') { Dica.el.style.left = Math.min(e.clientX + 12, window.innerWidth - 270) + 'px'; Dica.el.style.top = (e.clientY + 14) + 'px'; } });

/* ==========================================================================
   6. TELAS
   ========================================================================== */
const filtroVazio = () => ({ q: '', de: '', ate: '', supervisor: '', gestao: '', cliente: '', re: '', colaborador: '', tipo: '', status: '', responsavel: '', solicitante: '' });

const Estado = {
  filtros: {},                              // filtros mantidos por tela (persistem ao recarregar, por login)
  ordem: {}, pagina: {}, listaAtual: {},
  porPagina: CONFIG.itensPorPagina,
  periodo: { atalho: '30', de: '', ate: '' },
  gran: 'auto',
  hFiltro: { q: '', acao: '', de: '', ate: '' },
  edicaoId: null, voltarPara: 'correcoes'
};
/* Carrega as preferências do login que acabou de entrar. */
function aplicarPrefsSessao() {
  Estado.filtros = Prefs.ler('filtros', {}); Estado.ordem = {}; Estado.pagina = {}; Estado.listaAtual = {};
  Estado.porPagina = Prefs.ler('porPagina', CONFIG.itensPorPagina);
  Estado.periodo = Prefs.ler('periodo', { atalho: '30', de: '', ate: '' });
  Estado.gran = Prefs.ler('gran', 'auto');
  Estado.hFiltro = Prefs.ler('hfiltro', { q: '', acao: '', de: '', ate: '' });
  Estado.edicaoId = null;
}
const filtrosDe = v => (Estado.filtros[v] = { ...filtroVazio(), ...(Estado.filtros[v] || {}) });
const salvarFiltros = () => Prefs.gravar('filtros', Estado.filtros);

const VIEWS = {
  dashboard:   { titulo: 'Dashboard' },
  nova:        { titulo: 'Nova correção' },
  correcoes:   { titulo: 'Correções', lista: true, sub: 'Todas as solicitações registradas' },
  pendentes:   { titulo: 'Pendentes', lista: true, status: 'PENDENTE', sub: 'Solicitações que ainda não foram iniciadas' },
  tratativa:   { titulo: 'Em tratativa', lista: true, status: 'EM TRATATIVA', sub: 'Solicitações em andamento' },
  aguardando:  { titulo: 'Aguardando informação', lista: true, status: 'AGUARDANDO INFORMAÇÃO', sub: 'Solicitações paradas por falta de informação' },
  corrigidos:  { titulo: 'Corrigidos', lista: true, status: 'CORRIGIDO', sub: 'Solicitações já corrigidas' },
  indicadores: { titulo: 'Indicadores' },
  historico:   { titulo: 'Histórico' },
  usuarios:    { titulo: 'Usuários e acessos' }
};
const main = () => $('#conteudo');
const viewAtual = () => { const m = location.hash.match(/^#\/(\w+)/); if (m && VIEWS[m[1]]) return m[1]; return Auth.perfil ? PERFIS[Auth.perfil].inicio : 'dashboard'; };
const tituloView = v => (v === 'correcoes' && !Auth.pode('correcao.ver.todas')) ? 'Minhas solicitações' : VIEWS[v].titulo;

/* Guarda de acesso: bloqueia (e registra) quem tenta abrir uma área sem permissão, mesmo digitando o endereço. */
function guardar(perm) {
  if (Auth.pode(perm)) return true;
  Auth.negado(perm);
  toast('ACESSO NEGADO: seu perfil não tem permissão para acessar esta área.', 'erro');
  const ini = Auth.perfil ? PERFIS[Auth.perfil].inicio : null;
  if (ini && viewAtual() !== ini && Auth.pode(PERM_VIEW[ini])) navegar(ini);
  return false;
}
function navegar(v) { if (location.hash === '#/' + v) renderizar(); else location.hash = '#/' + v; }
function irParaLista(v, parciais = {}) { Estado.filtros[v] = { ...filtroVazio(), ...parciais }; Estado.pagina[v] = 1; salvarFiltros(); navegar(v); }

function renderizar() {
  if (!Auth.logado) { mostrarLogin(Auth.login ? 'Sua sessão não é mais válida. Entre novamente.' : ''); return; }
  const v = viewAtual();
  if (!guardar(PERM_VIEW[v])) return;
  if (v !== 'nova') Estado.edicaoId = null;
  $$('.nav a').forEach(a => { if (a.dataset.view === v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  document.title = tituloView(v) + ' — Correções Operacionais PROSECURITY';
  fecharMenu(); aplicarMenu();
  atualizarBadges(); atualizarAvisos();
  if (VIEWS[v].lista) renderLista(v);
  else ({ dashboard: renderDashboard, nova: renderForm, indicadores: renderIndicadores, historico: renderHistorico, usuarios: renderUsuarios })[v]();
  window.scrollTo(0, 0);
  const h1 = $('h1', main()); if (h1) h1.focus({ preventScroll: true });
}

function atualizarBadges() {
  const c = Servico.resumoStatus(Servico.listar());
  $$('[data-badge]').forEach(b => {
    const k = b.dataset.badge;
    const n = k === 'TOTAL' ? Servico.listar().length : (c[k] || 0);
    b.textContent = n ? String(n) : '';
  });
}
function atualizarAvisos() {
  const box = $('#avisos');
  let h = '';
  if (!Repo.persistente) h += `<div class="aviso aviso-erro" role="alert">${icone('alerta')}<span>ATENÇÃO: o armazenamento do navegador não está disponível. Os dados só existem nesta janela e serão perdidos ao fechar.${Auth.pode('backup') ? ' Use "Backup dos dados" para salvar.' : ''}</span></div>`;
  if (Servico.listar().some(r => r.demo)) {
    h += `<div class="aviso aviso-demo">${icone('info')}<span><strong>DADOS DE DEMONSTRAÇÃO:</strong> os registros marcados com "DEMO" são fictícios e servem apenas para testar o sistema.</span>
      ${Auth.pode('backup') ? '<button type="button" class="btn btn-sm" id="btn-remover-demo">Remover dados de demonstração</button>' : ''}</div>`;
  }
  if (Auth.pode('usuarios.admin')) {
    const padrao = Dados.usuarios.filter(u => u.ativo && u.senhaPadrao).map(u => u.login);
    if (padrao.length) h += `<div class="aviso aviso-erro" role="alert">${icone('alerta')}<span>ATENÇÃO: as contas <strong>${esc(padrao.join(', '))}</strong> ainda usam a senha inicial. Redefina as senhas em Usuários e acessos.</span>
      <button type="button" class="btn btn-sm" id="btn-ir-usuarios">Abrir Usuários</button></div>`;
  }
  box.innerHTML = h;
  const b = $('#btn-remover-demo');
  if (b) b.onclick = async () => {
    const ok = await confirmar({ titulo: 'Remover dados de demonstração', perigo: true, textoConfirmar: 'Remover demonstração',
      mensagemHTML: '<p>Serão removidos <strong>somente</strong> os registros marcados como DEMO e o histórico deles. Os registros reais não serão alterados.</p>' });
    if (!ok) return;
    try { Auth.exigir('backup'); await Repo.removerDemo(); await recarregar(); toast('Dados de demonstração removidos.', 'ok'); }
    catch (e) { toast(e.message, 'erro'); }
  };
  const u = $('#btn-ir-usuarios'); if (u) u.onclick = () => navegar('usuarios');
}
async function recarregar() {
  await carregarDados();
  renderizar();
}

/* ---------------- listas (datalists) ---------------- */
const supervisoresConhecidos = () => unicos([...CONFIG.supervisoresLista]);
const clientesConhecidos = () => unicos([...CONFIG.clientesLista, ...Servico.listar().map(r => r.cliente)]);
const pessoasDatalist = id => datalist(id, Servico.pessoasConhecidas());
const optHTML = (lista, sel = '', vazio = '') => (vazio !== null ? `<option value="">${esc(vazio)}</option>` : '') +
  lista.map(v => `<option value="${esc(v)}"${v === sel ? ' selected' : ''}>${esc(v)}</option>`).join('');
const datalist = (id, lista) => `<datalist id="${id}">${lista.map(v => `<option value="${esc(v)}">`).join('')}</datalist>`;

/* ---------------- FORMULÁRIO: nova correção / edição ---------------- */
function renderForm() {
  if (!guardar('correcao.criar')) return;
  const edId = Estado.edicaoId;
  const rec = edId ? Servico.obter(edId) : null;
  if (edId && (!rec || !Servico.podeEditar(rec))) { Estado.edicaoId = null; toast(rec ? 'ACESSO NEGADO: você não pode editar esta solicitação.' : 'Registro não encontrado.', 'erro'); return navegar(viewAtual() === 'nova' ? PERFIS[Auth.perfil].inicio : viewAtual()); }
  const mestre = Auth.pode('correcao.editar');
  let v = rec ? { ...rec } : { data: hojeISO(), supervisor: '', gestao: '', cliente: '', re: '', colaborador: '', tipo: '', dataOcorrencia: '', lancada: '', correta: '', motivo: '', evidencia: '', observacao: '', responsavel: '', solicitante: '' };
  let rascunhoRestaurado = false;
  if (!rec) {
    const r = Prefs.ler('rascunho', null);
    if (r && Object.values(r).some(x => x && String(x) !== hojeISO() && String(x).trim())) { v = { ...v, ...r, solicitante: '', data: hojeISO() }; rascunhoRestaurado = true; }
  }
  const campo = (id, rot, req, html, dica = '', cls = '') => `<div class="campo ${cls}" data-campo="${id}">
      <label class="lbl" for="f-${id}">${rot}${req ? ' <span class="req" aria-hidden="true">*</span><span class="sr-only">(obrigatório)</span>' : ''}</label>${html}
      ${dica ? `<div class="dica" id="dica-${id}">${dica}</div>` : ''}<div class="erro" id="erro-${id}" role="alert"></div></div>`;
  const inp = (id, tipo = 'text', extra = '') => `<input id="f-${id}" name="${id}" type="${tipo}" value="${esc(v[id] || '')}" ${extra} aria-describedby="erro-${id}">`;
  const area = (id, linhas, max) => `<textarea id="f-${id}" name="${id}" rows="${linhas}" maxlength="${max}" aria-describedby="erro-${id}">${esc(v[id] || '')}</textarea>`;

  main().innerHTML = `
    <div class="page-head"><div><h1 tabindex="-1">${rec ? 'Editar correção ' + esc(rec.id) : 'Nova correção'}</h1>
      <p class="sub">${rec ? 'O ID é mantido. Cada alteração fica registrada no histórico, com o valor anterior e o nome de quem alterou.' : 'Registre a solicitação de correção. Campos com * são obrigatórios.'}</p></div>
      ${rec ? seloStatus(rec.status) : ''}</div>
    <form class="card form-card" id="form-correcao" novalidate autocomplete="off">
      <div id="form-resumo" class="form-resumo-erro" role="alert" hidden></div>
      ${rascunhoRestaurado ? `<div class="form-rascunho" id="form-rascunho">Rascunho anterior restaurado automaticamente. <button type="button" class="link-btn" id="btn-descartar-rascunho">Descartar rascunho</button></div>` : ''}
      <p class="form-legenda"><span class="req">*</span> Campo obrigatório</p>
      <div class="grade-form">
        <div class="form-sec">Solicitação</div>
        ${rec ? '' : `${campo('solicitante', 'Responsável pela solicitação', true, inp('solicitante', 'text', 'maxlength="80"'), 'Nome da pessoa que está fazendo esta solicitação (a conta é compartilhada).', 'span2')}
        <div class="campo"><span class="lbl">Login (conta)</span><div class="conta-fixa">${esc(Auth.login)}</div><div class="dica">Data e hora serão registradas automaticamente.</div></div>`}
        ${campo('data', 'Data da solicitação', true, inp('data', 'date', 'readonly tabindex="-1" style="background:#eee;cursor:not-allowed"'), rec ? 'Fixa: registra quando a solicitação foi feita.' : 'Fixa: é sempre a data de hoje e não pode ser alterada.')}
        ${campo('supervisor', 'Supervisor / Sub área', true, inp('supervisor', 'text', 'list="dl-supervisores" maxlength="80"'), 'Escolha na lista (ex.: BRAVO I). A gestão é preenchida sozinha.')}
        ${campo('gestao', 'Gestão', true, `<select id="f-gestao" name="gestao" aria-describedby="erro-gestao">${optHTML(CONFIG.gestoes, v.gestao, 'Selecione…')}</select>`)}
        ${campo('cliente', 'Cliente / Contrato', true, inp('cliente', 'text', 'list="dl-clientes" maxlength="120"'), 'Comece a digitar e escolha na lista. Cliente novo pode ser digitado por inteiro.', 'span3')}
        <div class="form-sec">Colaborador e ocorrência</div>
        ${campo('re', 'RE', true, inp('re', 'text', 'inputmode="numeric" maxlength="12"'), CONFIG.reDica)}
        ${campo('colaborador', 'Colaborador', true, inp('colaborador', 'text', 'maxlength="120"'), '', 'span2')}
        ${campo('tipo', 'Tipo de correção', true, `<select id="f-tipo" name="tipo" aria-describedby="erro-tipo">${optHTML(CONFIG.tipos, v.tipo, 'Selecione…')}</select>`, '', 'span2')}
        ${campo('dataOcorrencia', 'Data da ocorrência', true, inp('dataOcorrencia', 'date', `max="${hojeISO()}"`))}
        <div class="form-sec">Correção</div>
        ${campo('lancada', 'Informação lançada', true, area('lancada', 2, 500), 'Como está registrado hoje (errado).', 'span3')}
        ${campo('correta', 'Informação correta', true, area('correta', 2, 500), 'Como deveria estar registrado.', 'span3')}
        ${campo('motivo', 'Motivo', true, area('motivo', 2, 500), '', 'span3')}
        ${campo('evidencia', 'Evidência', false, inp('evidencia', 'text', 'maxlength="300"'), 'Link, nº de protocolo, e-mail ou descrição do documento. (Anexo de arquivos exige servidor — ver README.)', 'span2')}
        ${campo('observacao', 'Observação', false, area('observacao', 2, 1000), '', 'span3')}
        ${rec ? `<div class="form-sec">Alteração</div>
          <div class="campo span3"><span class="lbl">Solicitação original</span><div class="conta-fixa">${esc(rec.solicitante || '—')} · conta ${esc(rec.criadoLogin || '—')} · ${fmtDataHora(rec.criadoEm)}</div></div>
          ${mestre ? campo('responsavel', 'Responsável pela tratativa', false, inp('responsavel', 'text', 'list="dl-pessoas" maxlength="80"'), 'Para mudar o status use "Alterar status" na lista.', 'span2') : ''}
          ${campo('pessoa', 'Responsável pela alteração', true, inp('pessoa', 'text', 'list="dl-pessoas" maxlength="80"'), 'Nome da pessoa que está alterando (conta compartilhada).', 'span2')}
          ${campo('motivoAlt', 'Motivo da alteração', true, area('motivoAlt', 2, 300), 'Fica registrado no histórico.', 'span3')}` : ''}
      </div>
      ${datalist('dl-supervisores', supervisoresConhecidos())}${datalist('dl-clientes', clientesConhecidos())}${pessoasDatalist('dl-pessoas')}
      <div class="form-acoes">
        <button type="submit" class="btn btn-primary" id="btn-salvar">${rec ? 'Salvar alterações' : 'Salvar correção'}</button>
        ${rec ? '<button type="button" class="btn" id="btn-cancelar-edicao">Cancelar</button>' : '<button type="button" class="btn" id="btn-limpar-form">Limpar formulário</button>'}
      </div>
    </form>`;

  const form = $('#form-correcao');
  const CAMPOS = ['data', 'supervisor', 'gestao', 'cliente', 're', 'colaborador', 'tipo', 'dataOcorrencia', 'lancada', 'correta', 'motivo', 'evidencia', 'observacao'];
  const EXTRAS = rec ? ['pessoa', 'motivoAlt'].concat(mestre ? ['responsavel'] : []) : ['solicitante'];
  const lerForm = () => { const o = {}; CAMPOS.concat(EXTRAS).forEach(k => { o[k] = $('#f-' + k).value; }); return o; };
  const limparErros = () => { $$('.campo.invalido', form).forEach(c => { c.classList.remove('invalido'); $('.erro', c).textContent = ''; $('input,select,textarea', c).removeAttribute('aria-invalid'); }); $('#form-resumo').hidden = true; };
  const mostrarErros = erros => {
    limparErros();
    const ks = Object.keys(erros);
    ks.forEach(k => { const c = $(`.campo[data-campo="${k}"]`, form); if (!c) return; c.classList.add('invalido'); $('.erro', c).textContent = erros[k]; $('input,select,textarea', c).setAttribute('aria-invalid', 'true'); });
    if (ks.length) {
      const r = $('#form-resumo'); r.hidden = false;
      r.textContent = `ATENÇÃO: ${ks.length === 1 ? 'há 1 campo' : 'há ' + ks.length + ' campos'} para corrigir antes de salvar. Os campos estão destacados abaixo.`;
      const primeiro = $(`#f-${ks[0]}`); if (primeiro) primeiro.focus();
    }
  };
  /* O rascunho NÃO guarda o nome da pessoa (conta compartilhada: cada pessoa se identifica). */
  const salvarRascunho = debounce(() => { if (!rec && form.isConnected) { const o = lerForm(); delete o.solicitante; Prefs.gravar('rascunho', o); } }, 300);

  form.addEventListener('input', e => {
    const c = e.target.closest('.campo');
    if (c && c.classList.contains('invalido')) { c.classList.remove('invalido'); $('.erro', c).textContent = ''; e.target.removeAttribute('aria-invalid'); }
    if (e.target.id === 'f-re') { e.target.value = e.target.value.replace(/[^\d.\-\s]/g, ''); }
    salvarRascunho();
  });
  /* Conveniências: preencher nome a partir do RE e gestão a partir do supervisor. */
  $('#f-re').addEventListener('blur', () => {
    const re = $('#f-re').value.replace(/\D/g, ''); $('#f-re').value = re;
    if (!re) return;
    const ant = Servico.listar().filter(r => r.re === re).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))[0];
    if (ant && !$('#f-colaborador').value.trim()) {
      $('#f-colaborador').value = ant.colaborador; salvarRascunho();
      toast(`Nome preenchido a partir de ${ant.id}. Confira antes de salvar.`, 'info', { duracao: 4000 });
    }
  });
  $('#f-supervisor').addEventListener('change', () => {
    const el = $('#f-supervisor'), s = el.value.trim();
    const ofi = CONFIG.supervisoresLista.find(x => norm(x) === norm(s));
    if (ofi) el.value = ofi;
    const g = CONFIG.gestoes.find(x => norm(ofi || s).split(' ')[0] === norm(x));
    if (g) { $('#f-gestao').value = g; salvarRascunho(); }
  });
  const d = $('#btn-descartar-rascunho');
  if (d) d.onclick = () => { Prefs.apagar('rascunho'); renderForm(); };
  const bl = $('#btn-limpar-form');
  if (bl) bl.onclick = async () => {
    if (!Object.values(lerForm()).some(x => x && x !== hojeISO())) return;
    if (await confirmar({ titulo: 'Limpar formulário', mensagemHTML: '<p>Os dados digitados serão descartados. Deseja continuar?</p>', textoConfirmar: 'Limpar', perigo: true })) { Prefs.apagar('rascunho'); renderForm(); }
  };
  const bc = $('#btn-cancelar-edicao');
  if (bc) bc.onclick = () => navegar(Estado.voltarPara || 'correcoes');

  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    const btn = $('#btn-salvar');
    const bruto = lerForm();
    const { erros, avisos } = Servico.validar(bruto, { ignorarId: edId, modo: rec ? 'edicao' : 'novo' });
    if (Object.keys(erros).length) { mostrarErros(erros); return; }
    limparErros();
    if (avisos.length) {
      const decisao = await confirmarAvisos(avisos, !rec);
      if (decisao !== 'salvar') return;
    }
    btn.disabled = true;
    try {
      if (rec) {
        const r = await Servico.editar(edId, bruto);
        toast(r.alterado ? `Correção ${edId} atualizada. ${r.campos.length} campo(s) alterado(s); valores anteriores mantidos no histórico.` : 'Nenhuma alteração foi feita.', r.alterado ? 'ok' : 'info');
        navegar(Estado.voltarPara || 'correcoes');
      } else {
        const novo = await Servico.criar(bruto, { confirmado: avisos.length > 0 });
        Prefs.apagar('rascunho');
        const dup = novo.status === 'DUPLICIDADE / VALIDAR';
        toast(`Correção registrada com sucesso. ID: ${novo.id}` + (dup ? ' (status DUPLICIDADE / VALIDAR)' : ''), dup ? 'aviso' : 'ok',
          { acao: () => abrirDetalhe(novo.id), textoAcao: 'Ver' });
        atualizarBadges(); atualizarAvisos(); renderForm();
      }
      if (!Repo.persistente) atualizarAvisos();
    } catch (e) {
      toast('Não foi possível salvar: ' + e.message, 'erro');
    } finally { btn.disabled = false; }
  });
}

/* Janela de confirmação para avisos NÃO bloqueantes (duplicidade, conflito, data antiga). */
function confirmarAvisos(avisos, novo) {
  return new Promise(resolve => {
    let fim = false; const fin = v => { if (!fim) { fim = true; resolve(v); } };
    const dup = avisos.some(a => a.tipo === 'duplicidade');
    const itens = avisos.map(a => `<li>${esc(a.msg)}${a.ids && a.ids.length ? `<div class="ids-lista">${a.ids.map(i => `<button type="button" class="btn btn-sm" data-ver="${esc(i)}">${esc(i)}</button>`).join('')}</div>` : ''}</li>`).join('');
    const m = Modal.abrir({
      titulo: 'Verifique antes de continuar', largura: '600px', fecharNoFundo: false, aoFechar: () => fin('revisar'),
      corpo: `<div class="callout callout-warn"><strong>Foram encontrados pontos de atenção. Nada foi bloqueado.</strong></div><ul class="aviso-lista">${itens}</ul>
        ${dup && novo ? '<div class="callout callout-info">Se você continuar, a solicitação será salva com o status <strong>DUPLICIDADE / VALIDAR</strong> para conferência.</div>' : ''}`,
      rodape: `<button type="button" class="btn btn-primary" data-revisar data-foco>Revisar dados</button><button type="button" class="btn" data-salvar>Salvar mesmo assim</button>`
    });
    $('[data-revisar]', m.el).onclick = () => m.fechar();
    $('[data-salvar]', m.el).onclick = () => { fin('salvar'); m.fechar(); };
    $$('[data-ver]', m.el).forEach(b => b.onclick = () => abrirDetalhe(b.dataset.ver));
  });
}

/* ---------------- MODAIS DE REGISTRO ---------------- */
function abrirDetalhe(id) {
  const r = Servico.obter(id);
  if (!r) return toast('Registro não encontrado ou sem permissão de acesso.', 'erro');
  const it = (rot, val, full) => `<div class="d-item${full ? ' full' : ''}"><div class="d-rot">${rot}</div><div class="d-val">${val ? esc(val) : '<span class="muted">—</span>'}</div></div>`;
  const hist = Servico.historicoDe(id).slice(0, 4);
  const podeEd = Servico.podeEditar(r), podeSt = Auth.pode('correcao.status');
  const m = Modal.abrir({
    tituloHTML: `${esc(r.id)} ${seloStatus(r.status)}${r.demo ? '<span class="tag-demo">DADOS DE DEMONSTRAÇÃO</span>' : ''}${ehAtrasada(r) ? `<span class="chip-atraso">ATRASADO · ${idadeDias(r)} d</span>` : ''}`,
    largura: '760px',
    corpo: `<div class="detalhe">
      ${it('Responsável pela solicitação', r.solicitante ? `${r.solicitante} (conta ${r.criadoLogin || '—'})` : '')}${it('Solicitado em', fmtDataHora(r.criadoEm))}
      ${it('Data da solicitação', fmtData(r.data))}${it('Data da ocorrência', fmtData(r.dataOcorrencia))}
      ${it('Supervisor', r.supervisor)}${it('Gestão', r.gestao)}
      ${it('Cliente / Contrato', r.cliente, true)}
      ${it('RE', r.re)}${it('Colaborador', r.colaborador)}
      ${it('Tipo de correção', r.tipo)}${it('Responsável pela correção / tratativa', r.responsavel)}
      ${it('Informação lançada', r.lancada, true)}${it('Informação correta', r.correta, true)}
      ${it('Motivo', r.motivo, true)}${it('Evidência', r.evidencia, true)}${it('Observação', r.observacao, true)}
      ${r.concluidoEm ? it('O que foi corrigido', r.correcaoRealizada, true) : ''}
      ${r.concluidoEm ? it('Corrigido por', r.corrigidoPor) + it('Corrigido em', fmtDataHora(r.concluidoEm) + ' (tratativa: ' + fmtDuracao(new Date(r.concluidoEm) - new Date(r.criadoEm)) + ')') : ''}
      ${it('Última atualização', fmtDataHora(r.atualizadoEm) + (r.atualizadoPor ? ' por ' + r.atualizadoPor : ''))}
    </div>
    <h3 style="margin:16px 0 4px;font-size:13px">Últimas movimentações</h3>${htmlTimeline(hist)}`,
    rodape: `<button type="button" class="btn" data-a="hist">${icone('historico')}Histórico completo</button>
      ${podeEd ? `<button type="button" class="btn" data-a="editar">${icone('editar')}Editar</button>` : ''}
      ${podeSt ? `<button type="button" class="btn btn-primary" data-a="status">${icone('trocar')}Tratativa / alterar status</button>` : ''}`
  });
  $('[data-a="hist"]', m.el).onclick = () => abrirHistorico(id);
  const be = $('[data-a="editar"]', m.el); if (be) be.onclick = () => { m.fechar(); iniciarEdicao(id); };
  const bs = $('[data-a="status"]', m.el); if (bs) bs.onclick = () => { m.fechar(); abrirStatus(id); };
}
function iniciarEdicao(id) {
  const r = Servico.obter(id);
  if (!r || !Servico.podeEditar(r)) { Auth.negado('correcao.editar'); return toast('ACESSO NEGADO: você não pode editar esta solicitação.', 'erro'); }
  Estado.edicaoId = id; Estado.voltarPara = viewAtual() === 'nova' ? 'correcoes' : viewAtual(); navegar('nova');
}

function htmlAlteracoes(campos) {
  if (!campos || !campos.length) return '';
  return `<ul class="alt-lista">${campos.map(c => `<li><strong>${esc(c.campo)}:</strong> ${c.de !== '' ? `<span class="alt-de">${esc(c.de)}</span> → ` : ''}${c.para !== '' ? esc(c.para) : '<em>(vazio)</em>'}</li>`).join('')}</ul>`;
}
const quemFez = h => `${esc(h.usuario || '—')}${h.login ? ` <span class="muted">(conta ${esc(h.login)}${h.perfil ? ' · ' + esc(h.perfil) : ''})</span>` : ''}`;
function htmlTimeline(itens) {
  if (!itens.length) return '<p class="muted">Sem movimentações registradas.</p>';
  return `<ol class="timeline">${itens.map(h => `<li><div class="t-quando">${fmtDataHora(h.dataHora)} · ${quemFez(h)}</div>
    <strong>${esc(h.acao)}</strong>${htmlAlteracoes(h.campos)}${h.comentario ? `<div>“${esc(h.comentario)}”</div>` : ''}</li>`).join('')}</ol>`;
}
function abrirHistorico(id) {
  const itens = Servico.historicoDe(id);
  if (!itens.length && !Servico.obter(id)) return toast('Histórico não disponível para o seu perfil.', 'erro');
  const r = Servico.obter(id);
  Modal.abrir({ titulo: `Histórico — ${id}`, largura: '700px',
    corpo: `${r ? '' : '<div class="callout callout-warn">Este registro foi excluído. O histórico foi preservado.</div>'}
      <p class="muted">O histórico é somente leitura: nenhuma entrada é sobrescrita.</p>${htmlTimeline(itens)}` });
}

/* Tratativa da CCO: status, responsável pela correção (pessoa) e o que foi corrigido. */
function abrirStatus(id) {
  if (!Auth.pode('correcao.status')) { Auth.negado('correcao.status'); return toast('ACESSO NEGADO: seu perfil não pode alterar o status.', 'erro'); }
  const r = Servico.obter(id);
  if (!r) return;
  const opcoes = STATUS.map(s => s.cod).filter(c => c !== r.status);
  const m = Modal.abrir({
    tituloHTML: `Tratativa — ${esc(r.id)}`, largura: '580px',
    corpo: `<p style="margin-bottom:12px">Status atual: ${seloStatus(r.status)}</p>
      <div class="campo" data-campo="novo"><label class="lbl" for="s-novo">Novo status <span class="req">*</span></label>
        <select id="s-novo">${optHTML(opcoes, '', 'Selecione…')}</select><div class="erro" role="alert"></div></div>
      <div class="campo" data-campo="resp" style="margin-top:12px"><label class="lbl" for="s-resp">Responsável pela correção <span class="req">*</span></label>
        <input id="s-resp" type="text" list="dl-resp-modal" maxlength="80" autocomplete="off">${pessoasDatalist('dl-resp-modal')}
        <div class="dica">Nome da pessoa que está realizando esta tratativa (conta ${esc(Auth.login)} é compartilhada). Data e hora ficam registradas.</div><div class="erro" role="alert"></div></div>
      <div class="campo" data-campo="feito" style="margin-top:12px" hidden><label class="lbl" for="s-feito">O que foi corrigido <span class="req">*</span></label>
        <textarea id="s-feito" rows="3" maxlength="500"></textarea><div class="dica">Descreva a correção realizada.</div><div class="erro" role="alert"></div></div>
      <div class="campo" data-campo="com" style="margin-top:12px"><label class="lbl" for="s-com">Comentário <span class="req" id="s-com-req" hidden>*</span></label>
        <textarea id="s-com" rows="3" maxlength="300"></textarea><div class="dica" id="s-com-dica">Registrado no histórico.</div><div class="erro" role="alert"></div></div>`,
    rodape: `<button type="button" class="btn" data-fechar-x>Cancelar</button><button type="button" class="btn btn-primary" id="s-ok">Salvar</button>`
  });
  const sel = $('#s-novo', m.el), resp = $('#s-resp', m.el), com = $('#s-com', m.el), feito = $('#s-feito', m.el);
  const reabrindo = ['CORRIGIDO', 'CANCELADO'].includes(r.status);
  const regras = () => {
    const n = sel.value;
    const precisaFeito = n === 'CORRIGIDO';
    const precisaCom = ['CANCELADO', 'AGUARDANDO INFORMAÇÃO'].includes(n) || (reabrindo && !!n);
    $('[data-campo="feito"]', m.el).hidden = !precisaFeito; $('#s-com-req', m.el).hidden = !precisaCom;
    $('#s-com-dica', m.el).textContent = n === 'CANCELADO' ? 'Informe o motivo do cancelamento.' : n === 'AGUARDANDO INFORMAÇÃO' ? 'Informe qual informação está sendo aguardada do supervisor.' : reabrindo && n ? 'Informe o motivo da reabertura.' : 'Registrado no histórico.';
    return { precisaFeito, precisaCom };
  };
  sel.onchange = regras;
  $('[data-fechar-x]', m.el).onclick = () => m.fechar();
  $('#s-ok', m.el).onclick = async () => {
    $$('.campo', m.el).forEach(c => { c.classList.remove('invalido'); $('.erro', c).textContent = ''; });
    const { precisaFeito, precisaCom } = regras();
    const erro = (k, t) => { const c = $(`[data-campo="${k}"]`, m.el); c.classList.add('invalido'); $('.erro', c).textContent = t; };
    let ok = true;
    if (!sel.value) { erro('novo', 'Selecione o novo status.'); ok = false; }
    const ep = validarPessoa(resp.value); if (ep) { erro('resp', ep); ok = false; }
    if (precisaFeito && feito.value.trim().length < 5) { erro('feito', 'Registre o que foi corrigido (mín. 5 caracteres).'); ok = false; }
    if (precisaCom && !com.value.trim()) { erro('com', 'Informe o comentário.'); ok = false; }
    if (!ok) return;
    try {
      await Servico.alterarStatus(id, sel.value, { responsavel: resp.value, comentario: com.value.trim(), correcaoRealizada: feito.value });
      m.fechar(); toast(`${id}: status alterado para ${sel.value}.`, 'ok');
      atualizarBadges(); renderizarSemFoco();
    } catch (e) { toast('Não foi possível alterar: ' + e.message, 'erro'); }
  };
}
/* Re-renderiza a tela atual mantendo rolagem (após ações em modal). */
function renderizarSemFoco() {
  const y = window.scrollY, v = viewAtual();
  if (VIEWS[v].lista) atualizarTabela(v); else if (v === 'dashboard') atualizarDashboard(); else if (v === 'indicadores') atualizarIndicadores(); else if (v === 'historico') atualizarHistorico(); else if (v === 'usuarios') renderUsuarios();
  window.scrollTo(0, y);
}

function abrirExcluir(id) {
  if (!Auth.pode('correcao.excluir')) { Auth.negado('correcao.excluir'); return toast('ACESSO NEGADO: somente o MESTRE pode excluir.', 'erro'); }
  const r = Servico.obter(id);
  if (!r) return;
  if (!Servico.podeExcluir(r)) return toast(`Exclusão não permitida para o status ${r.status}. Use CANCELADO para manter o registro.`, 'aviso');
  const m = Modal.abrir({
    titulo: `Excluir ${id}`, largura: '520px', fecharNoFundo: false,
    corpo: `<div class="callout callout-warn"><strong>Ação crítica.</strong> O registro <strong>${esc(r.id)}</strong> (${esc(r.colaborador)}, RE ${esc(r.re)}) será removido da lista. A exclusão e uma cópia dos dados ficam preservadas no Histórico.</div>
      <div class="campo" data-campo="pes"><label class="lbl" for="x-pes">Responsável pela exclusão <span class="req">*</span></label><input id="x-pes" type="text" list="dl-x-pes" maxlength="80" autocomplete="off">${pessoasDatalist('dl-x-pes')}<div class="erro" role="alert"></div></div>
      <div class="campo" data-campo="mot" style="margin-top:12px"><label class="lbl" for="x-mot">Motivo da exclusão <span class="req">*</span></label><textarea id="x-mot" rows="3" maxlength="300"></textarea><div class="erro" role="alert"></div></div>`,
    rodape: `<button type="button" class="btn" data-fechar-x data-foco>Cancelar</button><button type="button" class="btn btn-danger" id="x-ok">Excluir definitivamente</button>`
  });
  $('[data-fechar-x]', m.el).onclick = () => m.fechar();
  $('#x-ok', m.el).onclick = async () => {
    $$('.campo', m.el).forEach(c => { c.classList.remove('invalido'); $('.erro', c).textContent = ''; });
    const mot = $('#x-mot', m.el).value.trim(), pes = $('#x-pes', m.el).value;
    const erro = (k, t) => { const c = $(`[data-campo="${k}"]`, m.el); c.classList.add('invalido'); $('.erro', c).textContent = t; };
    let ok = true;
    const ep = validarPessoa(pes); if (ep) { erro('pes', ep); ok = false; }
    if (mot.length < 5) { erro('mot', 'Informe o motivo da exclusão (mín. 5 caracteres).'); ok = false; }
    if (!ok) return;
    try { await Servico.excluir(id, mot, pes); m.fechar(); toast(`${id} excluído. O histórico foi preservado.`, 'ok'); atualizarBadges(); renderizarSemFoco(); }
    catch (e) { toast('Não foi possível excluir: ' + e.message, 'erro'); }
  };
}

function acaoLinha(acao, id) {
  if (acao === 'ver') abrirDetalhe(id);
  else if (acao === 'editar') iniciarEdicao(id);
  else if (acao === 'status') abrirStatus(id);
  else if (acao === 'hist') abrirHistorico(id);
  else if (acao === 'excluir') abrirExcluir(id);
}

/* ---------------- LISTAS (Correções + telas por status) ---------------- */
const COLUNAS = [['id', 'ID'], ['data', 'Data'], ['supervisor', 'Supervisor'], ['gestao', 'Gestão'], ['cliente', 'Cliente'], ['re', 'RE'],
  ['colaborador', 'Colaborador'], ['tipo', 'Tipo'], ['dataOcorrencia', 'Data da ocorrência'], ['status', 'Status'], ['solicitante', 'Solicitado por'], ['responsavel', 'Corrigido por / Resp.'],
  ['atualizadoEm', 'Última atualização'], [null, 'Ações']];

function renderLista(v) {
  const cfg = VIEWS[v], f = filtrosDe(v), fixo = cfg.status || null;
  if (!Estado.ordem[v]) Estado.ordem[v] = { campo: 'id', dir: (fixo && STATUS_MAP[fixo].aberto) ? 'asc' : 'desc' };
  Estado.pagina[v] = 1;
  const todos = Servico.listar();
  const F = (id, rot, html) => `<div><label class="lbl" for="f-${id}">${rot}</label>${html}</div>`;
  main().innerHTML = `
    <div class="page-head"><div><h1 tabindex="-1">${esc(tituloView(v))}</h1><p class="sub">${esc(cfg.sub)}</p></div>
      ${Auth.pode('correcao.criar') ? `<button type="button" class="btn btn-primary" data-nova>${icone('plus')}Nova correção</button>` : ''}</div>
    <section class="card filtros" aria-label="Filtros">
      <div class="busca">${icone('busca')}<label class="sr-only" for="f-q">Pesquisa rápida</label>
        <input id="f-q" type="search" data-filtro="q" placeholder="Pesquisa rápida: RE, colaborador, cliente, supervisor, ID, responsável…" value="${esc(f.q)}"></div>
      <div class="grade-filtros">
        ${F('de', 'Solicitação de', `<input id="f-de" type="date" data-filtro="de" value="${esc(f.de)}">`)}
        ${F('ate', 'Solicitação até', `<input id="f-ate" type="date" data-filtro="ate" value="${esc(f.ate)}">`)}
        ${F('solicitante', 'Responsável pela solicitação', `<select id="f-solicitante" data-filtro="solicitante">${optHTML(unicos(todos.map(r => r.solicitante)), f.solicitante, 'Todos')}</select>`)}
        ${F('supervisor', 'Supervisor', `<select id="f-supervisor" data-filtro="supervisor">${optHTML(unicos(todos.map(r => r.supervisor)), f.supervisor, 'Todos')}</select>`)}
        ${F('gestao', 'Gestão', `<select id="f-gestao" data-filtro="gestao">${optHTML(CONFIG.gestoes, f.gestao, 'Todas')}</select>`)}
        ${F('cliente', 'Cliente', `<input id="f-cliente" type="text" list="dl-f-clientes" data-filtro="cliente" value="${esc(f.cliente)}" placeholder="Contém…">`)}
        ${F('re', 'RE', `<input id="f-re" type="text" inputmode="numeric" data-filtro="re" value="${esc(f.re)}" placeholder="Contém…">`)}
        ${F('colaborador', 'Colaborador', `<input id="f-colaborador" type="text" data-filtro="colaborador" value="${esc(f.colaborador)}" placeholder="Contém…">`)}
        ${F('tipo', 'Tipo', `<select id="f-tipo" data-filtro="tipo">${optHTML(CONFIG.tipos, f.tipo, 'Todos')}</select>`)}
        ${fixo ? '' : F('status', 'Status', `<select id="f-status" data-filtro="status">${optHTML(STATUS.map(s => s.cod), f.status, 'Todos')}</select>`)}
        ${F('responsavel', 'Responsável', `<select id="f-responsavel" data-filtro="responsavel"><option value="">Todos</option><option value="__SEM__"${f.responsavel === '__SEM__' ? ' selected' : ''}>(sem responsável)</option>${optHTML(unicos(todos.map(r => r.responsavel)), f.responsavel, null)}</select>`)}
      </div>
      <datalist id="dl-f-clientes">${clientesConhecidos().map(x => `<option value="${esc(x)}">`).join('')}</datalist>
      <div class="filtros-acoes"><button type="button" class="btn btn-sm" id="btn-limpar-filtros">Limpar filtros</button><span class="info" id="info-filtros"></span></div>
    </section>
    <section class="card tabela-card" aria-label="Tabela de correções">
      <div class="tabela-topo"><span class="cont" id="contagem" aria-live="polite"></span>
        ${Auth.pode('exportar') ? `<div class="export-btns"><button type="button" class="btn btn-sm" data-exp="csv">${icone('download')}Exportar CSV</button>
        <button type="button" class="btn btn-sm" data-exp="xlsx">${icone('arquivo')}Exportar Excel</button></div>` : ''}</div>
      <div class="tabela-wrap"><table class="tabela"><thead><tr id="cab-tabela"></tr></thead><tbody id="corpo-tabela"></tbody></table></div>
      <div class="paginacao" id="paginacao"></div>
    </section>`;

  const bn = $('[data-nova]'); if (bn) bn.onclick = () => { Estado.edicaoId = null; navegar('nova'); };
  const aplicar = debounce(() => { Estado.pagina[v] = 1; salvarFiltros(); atualizarTabela(v); }, 150);
  $$('[data-filtro]').forEach(el => { const h = () => { filtrosDe(v)[el.dataset.filtro] = el.value; aplicar(); }; el.addEventListener('input', h); el.addEventListener('change', h); });
  $('#btn-limpar-filtros').onclick = () => { Estado.filtros[v] = filtroVazio(); salvarFiltros(); renderLista(v); };
  $$('[data-exp]').forEach(b => b.onclick = () => exportarLista(v, b.dataset.exp));
  $('#corpo-tabela').addEventListener('click', e => {
    const b = e.target.closest('[data-acao]'); if (!b || b.getAttribute('aria-disabled') === 'true') { if (b) acaoLinha('excluir', b.dataset.id); return; }
    acaoLinha(b.dataset.acao, b.dataset.id);
  });
  $('#cab-tabela').addEventListener('click', e => {
    const b = e.target.closest('[data-ord]'); if (!b) return;
    const o = Estado.ordem[v];
    if (o.campo === b.dataset.ord) o.dir = o.dir === 'asc' ? 'desc' : 'asc'; else { o.campo = b.dataset.ord; o.dir = 'asc'; }
    atualizarTabela(v);
    const novo = $(`[data-ord="${b.dataset.ord}"]`); if (novo) novo.focus();
  });
  atualizarTabela(v);
}

function atualizarTabela(v) {
  const cfg = VIEWS[v], f = { ...filtrosDe(v) };
  if (cfg.status) f.status = cfg.status;
  const o = Estado.ordem[v];
  const todos = Servico.listar();
  const lista = Servico.ordenar(Servico.filtrar(todos, f), o.campo, o.dir);
  Estado.listaAtual[v] = lista;

  const ativos = Object.entries(filtrosDe(v)).filter(([k, x]) => x && !(cfg.status && k === 'status')).length;
  $('#info-filtros').innerHTML = ativos ? `<span class="filtros-ativos">${ativos} filtro(s) ativo(s)</span> — a exportação respeita estes filtros.` : 'Nenhum filtro ativo.';
  $('#contagem').textContent = `${lista.length} de ${cfg.status ? todos.filter(r => r.status === cfg.status).length : todos.length} registro(s)`;

  $('#cab-tabela').innerHTML = COLUNAS.map(([k, rot]) => {
    if (!k) return `<th scope="col"><div class="th-in">${rot.toUpperCase()}</div></th>`;
    const ativo = o.campo === k;
    return `<th scope="col" aria-sort="${ativo ? (o.dir === 'asc' ? 'ascending' : 'descending') : 'none'}"><button type="button" data-ord="${k}">${rot.toUpperCase()}<span class="seta" aria-hidden="true">${ativo ? (o.dir === 'asc' ? '▲' : '▼') : ''}</span></button></th>`;
  }).join('');

  const total = lista.length, pp = Number(Estado.porPagina);
  const paginas = Math.max(1, Math.ceil(total / pp));
  Estado.pagina[v] = Math.min(Math.max(1, Estado.pagina[v] || 1), paginas);
  const ini = (Estado.pagina[v] - 1) * pp;
  const fatia = lista.slice(ini, ini + pp);

  const corpo = $('#corpo-tabela');
  if (!fatia.length) {
    const semNada = !todos.length;
    corpo.innerHTML = `<tr><td colspan="14" class="vazio"><strong>${semNada ? 'Nenhuma correção cadastrada ainda.' : 'Nenhuma correção encontrada com os filtros atuais.'}</strong>
      ${semNada ? (Auth.pode('correcao.criar') ? '<button type="button" class="btn btn-primary" data-vazio-nova>Registrar primeira correção</button>' : '') : '<button type="button" class="btn" data-vazio-limpar>Limpar filtros</button>'}</td></tr>`;
    const a = $('[data-vazio-nova]', corpo); if (a) a.onclick = () => navegar('nova');
    const b = $('[data-vazio-limpar]', corpo); if (b) b.onclick = () => $('#btn-limpar-filtros').click();
  } else {
    corpo.innerHTML = fatia.map(r => {
      const atr = ehAtrasada(r), pode = Servico.podeExcluir(r);
      const B = (a, ic, rot, extra = '') => `<button type="button" class="btn-ico ${extra}" data-acao="${a}" data-id="${esc(r.id)}" title="${rot}" aria-label="${rot} ${esc(r.id)}">${icone(ic)}</button>`;
      return `<tr class="${atr ? 'atrasada' : ''}">
        <td class="id" data-label="ID"><button type="button" class="link-btn" data-acao="ver" data-id="${esc(r.id)}">${esc(r.id)}</button>${r.demo ? '<span class="tag-demo" title="Dados de demonstração">DEMO</span>' : ''}</td>
        <td data-label="Data" class="nowrap">${fmtData(r.data)}</td>
        <td data-label="Supervisor">${esc(r.supervisor)}</td>
        <td data-label="Gestão">${esc(r.gestao)}</td>
        <td class="cli" data-label="Cliente" title="${esc(r.cliente)}">${esc(r.cliente)}</td>
        <td data-label="RE">${esc(r.re)}</td>
        <td class="col" data-label="Colaborador" title="${esc(r.colaborador)}">${esc(r.colaborador)}</td>
        <td data-label="Tipo">${esc(r.tipo)}</td>
        <td data-label="Ocorrência" class="nowrap">${fmtData(r.dataOcorrencia)}</td>
        <td data-label="Status">${seloStatus(r.status)}${atr ? `<span class="chip-atraso" title="Aberto há mais de ${CONFIG.prazoAlertaDias} dias">ATRASADO</span>` : ''}${STATUS_MAP[r.status].aberto ? `<span class="idade">aberto há ${idadeDias(r)} d</span>` : ''}</td>
        <td data-label="Solicitado por">${r.solicitante ? esc(r.solicitante) : '<span class="muted">—</span>'}</td>
        <td data-label="Responsável">${r.responsavel ? esc(r.responsavel) : '<span class="muted">—</span>'}</td>
        <td data-label="Atualização" class="nowrap">${fmtDataHora(r.atualizadoEm)}</td>
        <td class="col-acoes" data-label="Ações">${B('ver', 'olho', 'Visualizar')}${Servico.podeEditar(r) ? B('editar', 'editar', 'Editar') : ''}${Auth.pode('correcao.status') ? B('status', 'trocar', 'Registrar tratativa / alterar status') : ''}${B('hist', 'historico', 'Visualizar histórico')}
          ${Auth.pode('correcao.excluir') ? `<button type="button" class="btn-ico perigo" data-acao="excluir" data-id="${esc(r.id)}" ${pode ? '' : 'aria-disabled="true"'} title="${pode ? 'Excluir' : 'Exclusão não permitida para este status'}" aria-label="Excluir ${esc(r.id)}">${icone('lixeira')}</button>` : ''}</td></tr>`;
    }).join('');
  }
  renderPaginacao('paginacao', v, total, paginas, () => atualizarTabela(v));
}

function renderPaginacao(elId, chave, total, paginas, cb) {
  const pg = Estado.pagina[chave], pp = Number(Estado.porPagina);
  const ini = total ? (pg - 1) * pp + 1 : 0, fim = Math.min(total, pg * pp);
  const el = $('#' + elId);
  el.innerHTML = `<span>Exibindo ${ini}–${fim} de ${total}</span>
    <div class="pg-ctrl"><label for="${elId}-pp" class="muted">Por página</label>
      <select id="${elId}-pp">${[25, 50, 100].map(n => `<option${n === pp ? ' selected' : ''}>${n}</option>`).join('')}</select>
      <button type="button" class="btn btn-sm" data-pg="-1" ${pg <= 1 ? 'disabled' : ''}>Anterior</button>
      <span>Página ${pg} de ${paginas}</span>
      <button type="button" class="btn btn-sm" data-pg="1" ${pg >= paginas ? 'disabled' : ''}>Próxima</button></div>`;
  $$('[data-pg]', el).forEach(b => b.onclick = () => { Estado.pagina[chave] = pg + Number(b.dataset.pg); cb(); });
  $('select', el).onchange = e => { Estado.porPagina = Number(e.target.value); Prefs.gravar('porPagina', Estado.porPagina); Estado.pagina[chave] = 1; cb(); };
}

/* ---------------- PERÍODO (compartilhado por Dashboard e Indicadores) ---------------- */
function intervaloPeriodo() {
  const p = Estado.periodo, hoje = hojeISO();
  switch (p.atalho) {
    case '7': return { de: addDias(hoje, -6), ate: hoje };
    case '30': return { de: addDias(hoje, -29), ate: hoje };
    case '90': return { de: addDias(hoje, -89), ate: hoje };
    case 'mes': return { de: hoje.slice(0, 8) + '01', ate: hoje };
    case 'tudo': return { de: '', ate: '' };
    default: return { de: p.de || '', ate: p.ate || '' };
  }
}
function htmlBarraPeriodo() {
  const p = Estado.periodo, iv = intervaloPeriodo();
  const A = (k, rot) => `<button type="button" class="btn btn-sm" data-atalho="${k}" aria-pressed="${p.atalho === k}">${rot}</button>`;
  return `<section class="card periodo" aria-label="Filtro de período">
    <div><span class="rot">Período (data da solicitação)</span><div class="atalhos">${A('7', '7 dias')}${A('30', '30 dias')}${A('90', '90 dias')}${A('mes', 'Mês atual')}${A('tudo', 'Tudo')}</div></div>
    <div class="datas"><div><label class="rot" for="p-de">De</label><input id="p-de" type="date" value="${esc(iv.de)}"></div>
      <div><label class="rot" for="p-ate">Até</label><input id="p-ate" type="date" value="${esc(iv.ate)}"></div></div></section>`;
}
function ligarBarraPeriodo(cb) {
  $$('[data-atalho]').forEach(b => b.onclick = () => {
    Estado.periodo = { atalho: b.dataset.atalho, de: '', ate: '' }; Prefs.gravar('periodo', Estado.periodo);
    const iv = intervaloPeriodo(); $('#p-de').value = iv.de; $('#p-ate').value = iv.ate;
    $$('[data-atalho]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); cb();
  });
  const custom = () => {
    Estado.periodo = { atalho: 'custom', de: $('#p-de').value, ate: $('#p-ate').value }; Prefs.gravar('periodo', Estado.periodo);
    $$('[data-atalho]').forEach(x => x.setAttribute('aria-pressed', 'false')); cb();
  };
  $('#p-de').onchange = custom; $('#p-ate').onchange = custom;
}
const rotuloPeriodo = iv => iv.de || iv.ate ? `${iv.de ? fmtData(iv.de) : 'início'} a ${iv.ate ? fmtData(iv.ate) : 'hoje'}` : 'todo o histórico';

/* ---------------- GRÁFICOS (HTML/SVG puros, sem bibliotecas) ---------------- */
/* Barras horizontais: líder em vermelho, demais em cinza. Rótulo e valor sempre visíveis. */
function graficoBarras(dados, { max = 8, fmt = v => String(v), vazio = 'Sem dados no período.' } = {}) {
  if (!dados.length) return `<p class="sem-dados">${vazio}</p>`;
  let itens = dados.slice();
  if (itens.length > max) {
    const resto = itens.slice(max - 1);
    itens = itens.slice(0, max - 1).concat([{ rotulo: `Outros (${resto.length})`, valor: resto.reduce((a, b) => a + b.valor, 0), outros: true }]);
  }
  const mx = Math.max(...itens.map(i => i.valor)) || 1;
  return `<ul class="barras">${itens.map((i, n) => `<li class="${n === 0 && !i.outros ? 'lider' : ''}${i.outros ? ' outros' : ''}" data-dica="${esc(i.rotulo)}: ${esc(fmt(i.valor))}">
    <span class="b-rot" title="${esc(i.rotulo)}">${esc(i.rotulo)}</span>
    <span class="b-trilho"><span class="b-barra" style="display:block;width:${Math.max(1, (i.valor / mx) * 100)}%"></span></span>
    <span class="b-val">${esc(fmt(i.valor))}</span></li>`).join('')}</ul>`;
}
/* Rosca de status: cor + texto + quantidade na legenda (nunca só cor). */
function graficoRosca(res) {
  const total = Object.values(res).reduce((a, b) => a + b, 0);
  if (!total) return '<p class="sem-dados">Sem dados no período.</p>';
  const R = 54, C = 2 * Math.PI * R; let acum = 0;
  const arcos = STATUS.filter(s => res[s.cod] > 0).map(s => {
    const frac = res[s.cod] / total, len = Math.max(0, frac * C - (STATUS.filter(x => res[x.cod] > 0).length > 1 ? 2 : 0));
    const a = `<circle cx="75" cy="75" r="${R}" fill="none" stroke="${s.cor}" stroke-width="22" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-acum).toFixed(2)}" transform="rotate(-90 75 75)" data-dica="${esc(s.cod)}: ${res[s.cod]} (${Math.round(frac * 100)}%)"/>`;
    acum += frac * C; return a;
  }).join('');
  return `<div class="rosca-box"><svg viewBox="0 0 150 150" role="img" aria-label="Distribuição por status, total ${total}">${arcos}
      <text x="75" y="73" text-anchor="middle" font-size="26" font-weight="700" fill="#2B2B2B">${total}</text>
      <text x="75" y="90" text-anchor="middle" font-size="10" fill="#6E6E6E">solicitações</text></svg>
    <ul class="legenda">${STATUS.map(s => `<li${res[s.cod] ? '' : ' class="muted"'}><span class="sw" style="background:${s.cor}"></span><span>${esc(s.cod)}</span>
      <span class="l-val">${res[s.cod]} <span class="muted" style="font-weight:400">(${Math.round((res[s.cod] / total) * 100)}%)</span></span></li>`).join('')}</ul></div>`;
}
/* Evolução: colunas por dia/semana/mês com valor visível e tabela alternativa. */
function serieEvolucao(lista, iv, gran) {
  const datas = lista.map(r => r.data).sort();
  const de = iv.de || datas[0], ate = iv.ate || hojeISO();
  if (!de || de > ate) return null;
  const dias = diasEntre(de, ate) + 1;
  const g = gran !== 'auto' ? gran : dias <= 45 ? 'dia' : dias <= 200 ? 'semana' : 'mes';
  const inicioSemana = iso => { const [y, m, d] = iso.split('-').map(Number); return addDias(iso, -((new Date(y, m - 1, d).getDay() + 6) % 7)); };
  const chave = iso => g === 'dia' ? iso : g === 'semana' ? inicioSemana(iso) : iso.slice(0, 7);
  const chaves = [];
  if (g === 'dia') for (let d = de; d <= ate; d = addDias(d, 1)) chaves.push(d);
  else if (g === 'semana') for (let d = inicioSemana(de); d <= ate; d = addDias(d, 7)) chaves.push(d);
  else { let [y, m] = de.split('-').map(Number); const fim = ate.slice(0, 7); for (;;) { const k = `${y}-${pad(m)}`; chaves.push(k); if (k >= fim) break; m++; if (m > 12) { m = 1; y++; } } }
  const cont = new Map(chaves.map(k => [k, 0]));
  lista.forEach(r => { const k = chave(r.data); if (cont.has(k)) cont.set(k, cont.get(k) + 1); });
  const rot = k => g === 'mes' ? `${k.slice(5)}/${k.slice(0, 4)}` : fmtData(k).slice(0, 5);
  const longo = k => g === 'mes' ? rot(k) : g === 'semana' ? `semana de ${fmtData(k)}` : fmtData(k);
  return { g, pontos: chaves.map(k => ({ k, rot: rot(k), longo: longo(k), v: cont.get(k) })) };
}
function graficoEvolucao(serie) {
  if (!serie || !serie.pontos.length || serie.pontos.every(p => p.v === 0)) return '<p class="sem-dados">Sem dados no período.</p>';
  const P = serie.pontos, n = P.length, W = 640, H = 230, L = 34, Rr = 8, T = 18, B = 34, pw = W - L - Rr, ph = H - T - B;
  const mx = Math.max(...P.map(p => p.v));
  const passo = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000].find(s => mx / s <= 4) || 1000, ymax = Math.ceil(mx / passo) * passo;
  const yv = v => T + ph - (v / ymax) * ph;
  const slot = pw / n, bw = Math.max(3, Math.min(28, slot * 0.62)), cadaRot = Math.ceil(n / 10);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Solicitações por ${serie.g}, total ${P.reduce((a, b) => a + b.v, 0)}">`;
  for (let v = 0; v <= ymax; v += passo) s += `<line x1="${L}" x2="${W - Rr}" y1="${yv(v)}" y2="${yv(v)}" stroke="${v === 0 ? '#8C8C8C' : '#E3E3E3'}" stroke-width="1"/><text x="${L - 6}" y="${yv(v) + 4}" text-anchor="end" font-size="10" fill="#6E6E6E">${v}</text>`;
  P.forEach((p, i) => {
    const x = L + slot * i + (slot - bw) / 2, y = yv(p.v), h = Math.max(0, T + ph - y);
    s += `<g data-dica="${esc(p.longo)}: ${p.v} solicitação(ões)"><rect x="${(L + slot * i).toFixed(1)}" y="${T}" width="${slot.toFixed(1)}" height="${ph}" fill="transparent"/>`;
    if (p.v > 0) s += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="#DE262E"/>`;
    if (p.v > 0 && n <= 16) s += `<text x="${(x + bw / 2).toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="700" fill="#2B2B2B">${p.v}</text>`;
    if (i % cadaRot === 0) s += `<text x="${(x + bw / 2).toFixed(1)}" y="${H - 14}" text-anchor="middle" font-size="10" fill="#6E6E6E">${p.rot}</text>`;
    s += '</g>';
  });
  s += '</svg>';
  const tabela = `<details style="margin-top:8px"><summary style="cursor:pointer;font-size:12px;color:#6E6E6E">Ver dados em tabela</summary>
    <table class="tabela-simples"><thead><tr><th>${serie.g === 'mes' ? 'Mês' : serie.g === 'semana' ? 'Semana (início)' : 'Dia'}</th><th>Solicitações</th></tr></thead>
    <tbody>${P.filter(p => p.v > 0).map(p => `<tr><td>${esc(p.longo)}</td><td>${p.v}</td></tr>`).join('')}</tbody></table></details>`;
  return `<div class="evo">${s}</div>${tabela}`;
}
const cardGraf = (cls, titulo, corpo, extra = '', nota = '') => `<section class="card graf ${cls}"><div class="graf-cab"><h2>${titulo}</h2>${extra || (nota ? `<span class="nota">${nota}</span>` : '')}</div>${corpo}</section>`;
const controleGran = () => `<div class="seg" role="group" aria-label="Agrupar evolução por">${[['auto', 'Auto'], ['dia', 'Dia'], ['semana', 'Semana'], ['mes', 'Mês']].map(([k, r]) => `<button type="button" data-gran="${k}" aria-pressed="${Estado.gran === k}">${r}</button>`).join('')}</div>`;
function ligarGran(cb) { $$('[data-gran]').forEach(b => b.onclick = () => { Estado.gran = b.dataset.gran; Prefs.gravar('gran', Estado.gran); cb(); }); }

/* Bloco de resumo (total no período, tempo médio, atrasadas, duplicidade). */
function htmlResumo(lista, iv) {
  const t = Servico.tempoMedio(lista), atr = lista.filter(ehAtrasada).length, dup = lista.filter(r => r.status === 'DUPLICIDADE / VALIDAR').length;
  const I = (rot, val, sub) => `<div class="card item"><div class="r-rot">${rot}</div><div class="r-val">${val}</div><div class="r-sub">${sub}</div></div>`;
  return I('Solicitações no período', lista.length, esc(rotuloPeriodo(iv))) +
    I('Tempo médio de tratativa', fmtDuracao(t.ms), t.n ? `média de ${t.n} corrigida(s)` : 'sem correções concluídas') +
    I('Pendências atrasadas', atr, `abertas há mais de ${CONFIG.prazoAlertaDias} dias`) +
    I('Duplicidade / validar', dup, 'aguardando conferência');
}

/* ---------------- DASHBOARD ---------------- */
function renderDashboard() {
  main().innerHTML = `<div class="page-head"><div><h1 tabindex="-1">Dashboard</h1><p class="sub">${Auth.perfil === 'CCO' ? 'Fila e andamento das solicitações sob tratativa do CCO' : 'Visão geral das solicitações de correção'}</p></div>
      ${Auth.pode('correcao.criar') ? `<button type="button" class="btn btn-primary" data-nova>${icone('plus')}Nova correção</button>` : ''}</div>
    ${htmlBarraPeriodo()}<div id="dash-kpis" class="kpis"></div><div id="dash-resumo" class="resumo"></div><div id="dash-graf" class="grade-graf"></div><div id="dash-listas" class="grade-graf"></div>`;
  const bn = $('[data-nova]'); if (bn) bn.onclick = () => { Estado.edicaoId = null; navegar('nova'); };
  ligarBarraPeriodo(atualizarDashboard);
  atualizarDashboard();
}
function atualizarDashboard() {
  const iv = intervaloPeriodo(), todos = Servico.listar();
  const lista = Servico.filtrar(todos, { de: iv.de, ate: iv.ate }), res = Servico.resumoStatus(lista), tot = lista.length;
  const K = (cls, rot, val, sub, ico, view, filtro) => `<button type="button" class="kpi ${cls}" data-kpi="${view}" data-filtro-status="${esc(filtro || '')}" aria-label="${esc(rot)}: ${val}. Abrir lista">
    <span class="kpi-rot">${icone(ico)}${esc(rot)}</span><span class="kpi-val">${val}</span><span class="kpi-sub">${sub}</span></button>`;
  const pct = n => tot ? `${Math.round((n / tot) * 100)}% do total` : '—';
  $('#dash-kpis').innerHTML =
    K('kpi-total', 'TOTAL', tot, 'no período', 'list', 'correcoes', '') +
    K('kpi-pendente', 'PENDENTES', res['PENDENTE'], pct(res['PENDENTE']), 'relogio', 'pendentes') +
    K('kpi-tratativa', 'EM TRATATIVA', res['EM TRATATIVA'], pct(res['EM TRATATIVA']), 'tratativa', 'tratativa') +
    K('kpi-aguardando', 'AGUARDANDO INFORMAÇÃO', res['AGUARDANDO INFORMAÇÃO'], pct(res['AGUARDANDO INFORMAÇÃO']), 'interrogacao', 'aguardando') +
    K('kpi-corrigido', 'CORRIGIDOS', res['CORRIGIDO'], pct(res['CORRIGIDO']), 'check', 'corrigidos') +
    K('kpi-cancelado', 'CANCELADOS', res['CANCELADO'], pct(res['CANCELADO']), 'x', 'correcoes', 'CANCELADO');
  $$('[data-kpi]', $('#dash-kpis')).forEach(b => b.onclick = () => {
    const ivx = intervaloPeriodo(); irParaLista(b.dataset.kpi, { de: ivx.de, ate: ivx.ate, status: b.dataset.filtroStatus || '' });
  });
  $('#dash-resumo').innerHTML = htmlResumo(lista, iv);
  const serie = serieEvolucao(lista, iv, Estado.gran);
  $('#dash-graf').innerHTML =
    cardGraf('g-8', 'Evolução das solicitações', graficoEvolucao(serie), controleGran()) +
    cardGraf('g-4', 'Status', graficoRosca(res)) +
    cardGraf('g-4', 'Correções por tipo', graficoBarras(Servico.contar(lista, 'tipo'))) +
    cardGraf('g-4', 'Correções por supervisor', graficoBarras(Servico.contar(lista, 'supervisor'))) +
    cardGraf('g-4', 'Correções por cliente', graficoBarras(Servico.contar(lista, 'cliente')));
  ligarGran(atualizarDashboard);

  const abertas = todos.filter(r => STATUS_MAP[r.status].aberto).sort((a, b) => a.criadoEm.localeCompare(b.criadoEm)).slice(0, 6);
  const dg = Servico.diagnosticos();
  const A = (n, txt, rotBtn, alvo, alerta) => `<li class="${n && alerta ? 'alerta' : ''}"><span class="n">${n}</span><span class="txt">${txt}</span><button type="button" class="btn btn-sm" ${n ? '' : 'disabled'} data-alvo="${alvo}">${rotBtn}</button></li>`;
  $('#dash-listas').innerHTML =
    cardGraf('g-8', 'Pendências mais antigas', abertas.length ? `<table class="tabela-simples"><thead><tr><th>ID</th><th>Colaborador</th><th>Cliente</th><th>Status</th><th>Aberto há</th></tr></thead><tbody>${abertas.map(r =>
      `<tr class="clic" data-ver="${esc(r.id)}"><td><strong>${esc(r.id)}</strong></td><td>${esc(r.colaborador)}</td><td>${esc(r.cliente)}</td><td>${seloStatus(r.status)}</td>
      <td>${idadeDias(r)} d${ehAtrasada(r) ? ' <span class="chip-atraso">ATRASADO</span>' : ''}</td></tr>`).join('')}</tbody></table>` : '<p class="sem-dados">Nenhuma pendência aberta.</p>', '', 'todas as abertas, independente do período') +
    cardGraf('g-4', 'Pontos de atenção', `<ul class="atencao">
      ${A(dg.aguardandoValidar.length, 'registros em DUPLICIDADE / VALIDAR', 'Ver', 'dup', true)}
      ${A(Servico.listar().filter(ehAtrasada).length, `pendências abertas há mais de ${CONFIG.prazoAlertaDias} dias`, 'Ver', 'pend', true)}
      ${A(dg.duplicidades.length, 'grupos com possível duplicidade', 'Ver', 'ind', true)}
      ${A(dg.reDivergente.length, 'REs com nomes divergentes', 'Ver', 'ind', true)}
      ${A(dg.inconsistentes.length, 'registros com campos inconsistentes', 'Ver', 'ind', true)}</ul>`);
  $$('[data-ver]', $('#dash-listas')).forEach(tr => tr.onclick = () => abrirDetalhe(tr.dataset.ver));
  $$('[data-alvo]', $('#dash-listas')).forEach(b => b.onclick = () => {
    if (b.dataset.alvo === 'dup') irParaLista('correcoes', { status: 'DUPLICIDADE / VALIDAR' });
    else if (b.dataset.alvo === 'pend') irParaLista('pendentes');
    else { navegar('indicadores'); setTimeout(() => { const e = $('#diagnosticos'); if (e) e.scrollIntoView({ behavior: 'smooth' }); }, 60); }
  });
}

/* ---------------- INDICADORES ---------------- */
function renderIndicadores() {
  main().innerHTML = `<div class="page-head"><div><h1 tabindex="-1">Indicadores</h1><p class="sub">Análise operacional calculada a partir dos dados cadastrados</p></div></div>
    ${htmlBarraPeriodo()}<div id="ind-resumo" class="resumo"></div><div id="ind-graf" class="grade-graf"></div><div id="diagnosticos"></div>`;
  ligarBarraPeriodo(atualizarIndicadores);
  atualizarIndicadores();
}
function atualizarIndicadores() {
  const iv = intervaloPeriodo(), lista = Servico.filtrar(Servico.listar(), { de: iv.de, ate: iv.ate }), res = Servico.resumoStatus(lista);
  $('#ind-resumo').innerHTML = htmlResumo(lista, iv);
  const porTipo = new Map();
  lista.filter(r => r.status === 'CORRIGIDO' && r.concluidoEm).forEach(r => { if (!porTipo.has(r.tipo)) porTipo.set(r.tipo, []); porTipo.get(r.tipo).push(r); });
  const tempoTipo = Array.from(porTipo, ([rotulo, regs]) => ({ rotulo, valor: Servico.tempoMedio(regs).ms })).sort((a, b) => b.valor - a.valor);
  $('#ind-graf').innerHTML =
    cardGraf('g-8', 'Evolução por período', graficoEvolucao(serieEvolucao(lista, iv, Estado.gran)), controleGran()) +
    cardGraf('g-4', 'Status', graficoRosca(res)) +
    cardGraf('g-4', 'Correções por tipo', graficoBarras(Servico.contar(lista, 'tipo'), { max: 10 })) +
    cardGraf('g-4', 'Correções por supervisor', graficoBarras(Servico.contar(lista, 'supervisor'), { max: 10 })) +
    cardGraf('g-4', 'Correções por gestão', graficoBarras(Servico.contar(lista, 'gestao'), { max: 10 })) +
    cardGraf('g-6', 'Correções por cliente', graficoBarras(Servico.contar(lista, 'cliente'), { max: 10 })) +
    cardGraf('g-6', 'Tempo médio de tratativa por tipo', graficoBarras(tempoTipo, { max: 10, fmt: fmtDuracao, vazio: 'Nenhuma correção concluída no período.' }), '', 'do registro até CORRIGIDO');
  ligarGran(atualizarIndicadores);

  /* Inconsistências e duplicidades (sobre todos os registros, não só o período). */
  const dg = Servico.diagnosticos();
  const ids = regs => `<div class="ids-lista">${regs.map(r => `<button type="button" class="btn btn-sm" data-ver="${esc(r.id)}" title="${esc(r.status)}">${esc(r.id)}</button>`).join('')}</div>`;
  const tab = (cab, linhas) => `<table class="tabela-simples"><thead><tr>${cab.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${linhas.join('')}</tbody></table>`;
  const vazio = '<p class="muted">Nenhuma ocorrência.</p>';
  $('#diagnosticos').innerHTML = `<section class="card graf diag-sec"><div class="graf-cab"><h2>Inconsistências e possíveis duplicidades</h2><span class="nota">considera todos os registros</span></div>
    <h3>Possíveis duplicidades (mesmo RE, cliente e data da ocorrência) — ${dg.duplicidades.length}</h3>
    ${dg.duplicidades.length ? tab(['RE / Colaborador', 'Cliente', 'Ocorrência', 'Registros'], dg.duplicidades.map(g => `<tr><td>${esc(g[0].re)} · ${esc(g[0].colaborador)}</td><td>${esc(g[0].cliente)}</td><td>${fmtData(g[0].dataOcorrencia)}</td><td>${ids(g)}</td></tr>`)) : vazio}
    <h3>RE com nomes divergentes — ${dg.reDivergente.length}</h3>
    ${dg.reDivergente.length ? tab(['RE', 'Nomes encontrados', 'Registros'], dg.reDivergente.map(x => `<tr><td>${esc(x.re)}</td><td>${x.nomes.map(esc).join('<br>')}</td><td>${ids(x.regs)}</td></tr>`)) : vazio}
    <h3>Campos inconsistentes — ${dg.inconsistentes.length}</h3>
    ${dg.inconsistentes.length ? tab(['Registro', 'Problema', 'Colaborador'], dg.inconsistentes.map(x => `<tr><td>${ids([x.rec])}</td><td>${esc(x.problema)}</td><td>${esc(x.rec.colaborador)}</td></tr>`)) : vazio}
    <h3>Marcados como DUPLICIDADE / VALIDAR — ${dg.aguardandoValidar.length}</h3>
    ${dg.aguardandoValidar.length ? ids(dg.aguardandoValidar) : vazio}</section>`;
  $$('[data-ver]', $('#diagnosticos')).forEach(b => b.onclick = () => abrirDetalhe(b.dataset.ver));
}

/* ---------------- HISTÓRICO GERAL ---------------- */
function renderHistorico() {
  Estado.pagina.historico = 1;
  const f = Estado.hFiltro;
  const acoes = unicos(Servico.historicoGeral().map(h => h.acao));
  main().innerHTML = `<div class="page-head"><div><h1 tabindex="-1">Histórico</h1><p class="sub">Todas as movimentações registradas. Somente leitura: nenhuma entrada é sobrescrita.</p></div></div>
    <section class="card filtros"><div class="busca">${icone('busca')}<label class="sr-only" for="h-q">Pesquisar no histórico</label>
      <input id="h-q" type="search" placeholder="Pesquisar por ID, pessoa, conta, campo, valor ou comentário…" value="${esc(f.q)}"></div>
      <div class="grade-filtros"><div><label class="lbl" for="h-acao">Ação</label><select id="h-acao">${optHTML(acoes, f.acao, 'Todas')}</select></div>
      <div><label class="lbl" for="h-de">Data de</label><input id="h-de" type="date" value="${esc(f.de)}"></div>
      <div><label class="lbl" for="h-ate">Data até</label><input id="h-ate" type="date" value="${esc(f.ate)}"></div></div>
      <div class="filtros-acoes"><button type="button" class="btn btn-sm" id="h-limpar">Limpar filtros</button></div></section>
    <section class="card tabela-card"><div class="tabela-topo"><span class="cont" id="h-cont" aria-live="polite"></span>
      ${Auth.pode('exportar') ? `<div class="export-btns"><button type="button" class="btn btn-sm" id="h-csv">${icone('download')}Exportar CSV</button></div>` : ''}</div>
      <div class="tabela-wrap"><table class="tabela"><thead><tr><th scope="col"><div class="th-in">DATA / HORA</div></th><th scope="col"><div class="th-in">ID</div></th><th scope="col"><div class="th-in">AÇÃO</div></th><th scope="col"><div class="th-in">PESSOA (CONTA)</div></th><th scope="col"><div class="th-in">ALTERAÇÕES</div></th><th scope="col"><div class="th-in">COMENTÁRIO</div></th></tr></thead><tbody id="h-corpo"></tbody></table></div>
      <div class="paginacao" id="h-pag"></div></section>`;
  const aplicar = debounce(() => { Estado.hFiltro = { q: $('#h-q').value, acao: $('#h-acao').value, de: $('#h-de').value, ate: $('#h-ate').value }; Prefs.gravar('hfiltro', Estado.hFiltro); Estado.pagina.historico = 1; atualizarHistorico(); }, 150);
  ['#h-q', '#h-acao', '#h-de', '#h-ate'].forEach(s => { $(s).addEventListener('input', aplicar); $(s).addEventListener('change', aplicar); });
  $('#h-limpar').onclick = () => { Estado.hFiltro = { q: '', acao: '', de: '', ate: '' }; Prefs.gravar('hfiltro', Estado.hFiltro); renderHistorico(); };
  const hc = $('#h-csv'); if (hc) hc.onclick = () => exportarHistorico();
  $('#h-corpo').addEventListener('click', e => { const b = e.target.closest('[data-hid]'); if (b) { Servico.obter(b.dataset.hid) ? abrirDetalhe(b.dataset.hid) : abrirHistorico(b.dataset.hid); } });
  atualizarHistorico();
}
function atualizarHistorico() {
  const f = Estado.hFiltro, termos = norm(f.q).split(' ').filter(Boolean);
  const txt = h => norm([h.correcaoId, h.usuario, h.login, h.perfil, h.acao, h.comentario, ...(h.campos || []).flatMap(c => [c.campo, c.de, c.para])].join(' '));
  const todosH = Servico.historicoGeral();
  const lista = todosH.filter(h => {
    const dia = hojeISO(new Date(h.dataHora));
    if (f.acao && h.acao !== f.acao) return false;
    if (f.de && dia < f.de) return false;
    if (f.ate && dia > f.ate) return false;
    if (termos.length) { const t = txt(h); if (!termos.every(x => t.includes(x))) return false; }
    return true;
  }).sort((a, b) => b.dataHora.localeCompare(a.dataHora));
  Estado.listaAtual.historico = lista;
  $('#h-cont').textContent = `${lista.length} de ${todosH.length} movimentação(ões)`;
  const pp = Number(Estado.porPagina), paginas = Math.max(1, Math.ceil(lista.length / pp));
  Estado.pagina.historico = Math.min(Math.max(1, Estado.pagina.historico || 1), paginas);
  const fatia = lista.slice((Estado.pagina.historico - 1) * pp, Estado.pagina.historico * pp);
  $('#h-corpo').innerHTML = fatia.length ? fatia.map(h => `<tr>
    <td class="nowrap" data-label="Data/hora">${fmtDataHora(h.dataHora)}</td>
    <td class="id" data-label="ID"><button type="button" class="link-btn" data-hid="${esc(h.correcaoId)}">${esc(h.correcaoId)}</button></td>
    <td data-label="Ação"><strong>${esc(h.acao)}</strong></td><td data-label="Pessoa (conta)">${quemFez(h)}</td>
    <td data-label="Alterações">${htmlAlteracoes(h.campos) || '<span class="muted">—</span>'}</td>
    <td data-label="Comentário">${h.comentario ? esc(h.comentario) : '<span class="muted">—</span>'}</td></tr>`).join('')
    : '<tr><td colspan="6" class="vazio"><strong>Nenhuma movimentação encontrada.</strong></td></tr>';
  renderPaginacao('h-pag', 'historico', lista.length, paginas, atualizarHistorico);
}

/* ==========================================================================
   7. EXPORTAÇÃO  (CSV e Excel .xlsx — gerados no navegador, sem bibliotecas)
   A exportação usa exatamente a lista filtrada/ordenada que está na tela.
   ========================================================================== */
const COLS_EXPORT = [
  { titulo: 'ID', valor: r => r.id },
  { titulo: 'Data da solicitação', valor: r => fmtData(r.data) },
  { titulo: 'Supervisor', valor: r => r.supervisor },
  { titulo: 'Gestão', valor: r => r.gestao },
  { titulo: 'Cliente/Contrato', valor: r => r.cliente },
  { titulo: 'RE', valor: r => r.re },
  { titulo: 'Colaborador', valor: r => r.colaborador },
  { titulo: 'Tipo de correção', valor: r => r.tipo },
  { titulo: 'Data da ocorrência', valor: r => fmtData(r.dataOcorrencia) },
  { titulo: 'Informação lançada', valor: r => r.lancada },
  { titulo: 'Informação correta', valor: r => r.correta },
  { titulo: 'Motivo', valor: r => r.motivo },
  { titulo: 'Evidência', valor: r => r.evidencia },
  { titulo: 'Observação', valor: r => r.observacao },
  { titulo: 'Status', valor: r => r.status },
  { titulo: 'Responsável pela correção', valor: r => r.responsavel },
  { titulo: 'O que foi corrigido', valor: r => r.correcaoRealizada },
  { titulo: 'Corrigido por', valor: r => r.corrigidoPor },
  { titulo: 'Registrado em', valor: r => fmtDataHora(r.criadoEm) },
  { titulo: 'Responsável pela solicitação', valor: r => r.solicitante || r.criadoPor },
  { titulo: 'Conta que registrou', valor: r => r.criadoLogin },
  { titulo: 'Última atualização', valor: r => fmtDataHora(r.atualizadoEm) },
  { titulo: 'Corrigido em', valor: r => r.concluidoEm ? fmtDataHora(r.concluidoEm) : '' },
  { titulo: 'Dados de demonstração', valor: r => r.demo ? 'SIM' : '' }
];
const COLS_HIST = [
  { titulo: 'Data/hora', valor: h => fmtDataHora(h.dataHora) },
  { titulo: 'ID', valor: h => h.correcaoId },
  { titulo: 'Ação', valor: h => h.acao },
  { titulo: 'Pessoa', valor: h => h.usuario },
  { titulo: 'Conta (login)', valor: h => h.login },
  { titulo: 'Perfil', valor: h => h.perfil },
  { titulo: 'Alterações', valor: h => (h.campos || []).map(c => `${c.campo}: ${c.de === '' ? '(vazio)' : c.de} -> ${c.para === '' ? '(vazio)' : c.para}`).join(' | ') },
  { titulo: 'Comentário', valor: h => h.comentario }
];

function baixar(blob, nome) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const carimbo = () => { const d = new Date(); return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`; };
const slug = s => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* CSV com separador ";" e BOM UTF-8 (abre corretamente no Excel em português). Protege contra injeção de fórmula. */
function celulaCSV(v) {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[";\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function gerarCSV(cols, linhas) {
  return '﻿' + [cols.map(c => celulaCSV(c.titulo)).join(';'), ...linhas.map(r => cols.map(c => celulaCSV(c.valor(r))).join(';'))].join('\r\n');
}

/* --- XLSX mínimo: ZIP sem compressão + XML da planilha --- */
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC_T[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function zipSemCompressao(arquivos, mime) {
  const enc = new TextEncoder(), partes = [], central = [];
  let offset = 0;
  const ag = new Date(), hora = (ag.getHours() << 11) | (ag.getMinutes() << 5) | (ag.getSeconds() >> 1), dia = ((ag.getFullYear() - 1980) << 9) | ((ag.getMonth() + 1) << 5) | ag.getDate();
  arquivos.forEach(f => {
    const nome = enc.encode(f.nome), dados = enc.encode(f.dados), crc = crc32(dados), n = dados.length;
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
    lh.setUint16(10, hora, true); lh.setUint16(12, dia, true); lh.setUint32(14, crc, true); lh.setUint32(18, n, true); lh.setUint32(22, n, true);
    lh.setUint16(26, nome.length, true); lh.setUint16(28, 0, true);
    partes.push(new Uint8Array(lh.buffer), nome, dados);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
    ch.setUint16(12, hora, true); ch.setUint16(14, dia, true); ch.setUint32(16, crc, true); ch.setUint32(20, n, true); ch.setUint32(24, n, true);
    ch.setUint16(28, nome.length, true); ch.setUint32(42, offset, true);
    central.push(new Uint8Array(ch.buffer), nome);
    offset += 30 + nome.length + n;
  });
  const tam = central.reduce((a, b) => a + b.length, 0), fim = new DataView(new ArrayBuffer(22));
  fim.setUint32(0, 0x06054b50, true); fim.setUint16(8, arquivos.length, true); fim.setUint16(10, arquivos.length, true); fim.setUint32(12, tam, true); fim.setUint32(16, offset, true);
  return new Blob([...partes, ...central, new Uint8Array(fim.buffer)], { type: mime });
}
const xmlEsc = s => String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const letraCol = i => { let s = ''; for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s; return s; };
function gerarXLSX(cols, linhas, nomeAba = 'Correções') {
  const larg = cols.map(c => Math.min(50, Math.max(10, c.titulo.length + 2, ...linhas.slice(0, 200).map(r => String(c.valor(r) ?? '').length + 2))));
  const cel = (ref, txt, estilo) => `<c r="${ref}" t="inlineStr" s="${estilo}"><is><t xml:space="preserve">${xmlEsc(txt)}</t></is></c>`;
  let rows = `<row r="1">${cols.map((c, j) => cel(letraCol(j) + '1', c.titulo, 1)).join('')}</row>`;
  linhas.forEach((r, i) => { rows += `<row r="${i + 2}">${cols.map((c, j) => cel(letraCol(j) + (i + 2), c.valor(r), 2)).join('')}</row>`; });
  const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main', RNS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${NS}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
    <cols>${larg.map((w, j) => `<col min="${j + 1}" max="${j + 1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${rows}</sheetData>
    <autoFilter ref="A1:${letraCol(cols.length - 1)}${linhas.length + 1}"/></worksheet>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="${NS}"><fonts count="2"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Arial"/></font></fonts>
    <fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDE262E"/><bgColor indexed="64"/></patternFill></fill></fills>
    <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
    <cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
    <xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs></styleSheet>`;
  return zipSemCompressao([
    { nome: '[Content_Types].xml', dados: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>` },
    { nome: '_rels/.rels', dados: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${RNS}/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { nome: 'xl/workbook.xml', dados: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${NS}" xmlns:r="${RNS}"><sheets><sheet name="${xmlEsc(nomeAba)}" sheetId="1" r:id="rId1"/></sheets></workbook>` },
    { nome: 'xl/_rels/workbook.xml.rels', dados: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${RNS}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${RNS}/styles" Target="styles.xml"/></Relationships>` },
    { nome: 'xl/styles.xml', dados: styles },
    { nome: 'xl/worksheets/sheet1.xml', dados: sheet }
  ], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

function exportarLista(v, formato) {
  try { Auth.exigir('exportar'); } catch (e) { return toast(e.message, 'erro'); }
  const lista = Estado.listaAtual[v] || [];
  if (!lista.length) return toast('Não há registros para exportar com os filtros atuais.', 'aviso');
  const cfg = VIEWS[v], filtrado = Object.entries(filtrosDe(v)).some(([k, x]) => x && !(cfg.status && k === 'status'));
  const base = `correcoes_${cfg.status ? slug(cfg.status) : 'todas'}${filtrado ? '_filtrado' : ''}_${carimbo()}`;
  if (formato === 'csv') baixar(new Blob([gerarCSV(COLS_EXPORT, lista)], { type: 'text/csv;charset=utf-8' }), base + '.csv');
  else baixar(gerarXLSX(COLS_EXPORT, lista), base + '.xlsx');
  toast(`Exportação concluída: ${lista.length} registro(s)${filtrado || cfg.status ? ' (filtros aplicados)' : ''}.`, 'ok');
}
function exportarHistorico() {
  try { Auth.exigir('exportar'); Auth.exigir('historico.ver'); } catch (e) { return toast(e.message, 'erro'); }
  const lista = Estado.listaAtual.historico || [];
  if (!lista.length) return toast('Não há movimentações para exportar.', 'aviso');
  baixar(new Blob([gerarCSV(COLS_HIST, lista)], { type: 'text/csv;charset=utf-8' }), `historico_correcoes_${carimbo()}.csv`);
  toast(`Exportação concluída: ${lista.length} movimentação(ões).`, 'ok');
}

/* ---------------- Backup e usuário ---------------- */
function abrirBackup() {
  if (!guardar('backup')) return;
  const m = Modal.abrir({ titulo: 'Backup dos dados', largura: '540px',
    corpo: `<div class="callout callout-info">${Sync.servidor ? 'Os dados ficam no <strong>servidor</strong>; esta máquina guarda apenas uma cópia de trabalho. O backup abaixo baixa a cópia que você está vendo agora.' : 'Os dados ficam gravados <strong>somente neste navegador e neste computador</strong> (localStorage). Limpar os dados do navegador apaga tudo. Faça backup com frequência.'}</div>
      <p style="margin:12px 0 8px"><button type="button" class="btn btn-primary" id="bk-baixar">${icone('download')}Baixar backup (.json)</button></p>
      <hr style="border:0;border-top:1px solid var(--line);margin:16px 0">
      <p><strong>Servidor:</strong> ${esc(Sync.resumo())}</p>
      ${Sync.servidor ? '<p class="muted">Modo servidor: o servidor faz cópias automáticas a cada hora na pasta <strong>dados/backups</strong>. Para restaurar, use o arquivo de cópia no computador do servidor.</p>' : `<label class="lbl" for="bk-arq">Restaurar a partir de um backup (.json)</label><input id="bk-arq" type="file" accept="application/json,.json">
      <p class="muted" style="margin-top:6px">A restauração <strong>substitui</strong> as correções e o histórico atuais. As contas de acesso e as senhas não fazem parte do backup.</p>`}` });
  $('#bk-baixar', m.el).onclick = () => {
    try { Auth.exigir('backup'); } catch (err) { return toast(err.message, 'erro'); }
    const dados = { app: 'prosecurity-correcoes', versao: CONFIG.versao, geradoEm: agoraISO(), correcoes: Dados.correcoes, historico: Dados.historico, meta: Dados.meta };
    baixar(new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' }), `backup_correcoes_${carimbo()}.json`);
    toast('Backup gerado.', 'ok');
  };
  const arqIn = $('#bk-arq', m.el);
  if (arqIn) arqIn.onchange = async e => {
    try { Auth.exigir('backup'); } catch (err) { return toast(err.message, 'erro'); }
    const arq = e.target.files[0]; if (!arq) return;
    try {
      const d = JSON.parse(await arq.text());
      if (d.app !== 'prosecurity-correcoes' || !Array.isArray(d.correcoes) || !Array.isArray(d.historico)) throw new Error('arquivo não é um backup válido deste sistema');
      if (!d.correcoes.every(r => r && typeof r.id === 'string' && STATUS_MAP[r.status])) throw new Error('registros inválidos no backup');
      const ok = await confirmar({ titulo: 'Restaurar backup', perigo: true, textoConfirmar: 'Substituir dados',
        mensagemHTML: `<p>O backup contém <strong>${d.correcoes.length}</strong> correção(ões) e <strong>${d.historico.length}</strong> movimentação(ões), gerado em ${esc(fmtDataHora(d.geradoEm))}.</p><p><strong>Todos os dados atuais serão substituídos.</strong></p>` });
      if (!ok) return;
      const seq = Math.max(Number(d.meta && d.meta.seq) || 0, ...d.correcoes.map(r => Number((r.id.match(/^COR-(\d+)$/) || [])[1]) || 0));
      await Repo.substituirTudo({ correcoes: d.correcoes, historico: d.historico, meta: { seq, demoInicializado: true } });
      m.fechar(); await recarregar(); toast('Backup restaurado com sucesso.', 'ok');
    } catch (err) { toast('Não foi possível restaurar: ' + err.message, 'erro'); e.target.value = ''; }
  };
}
/* ==========================================================================
   8. DADOS DE DEMONSTRAÇÃO (fictícios) E INICIALIZAÇÃO
   ========================================================================== */
const MODELOS_DEMO = [
  ['FALTA', 'PRESENÇA (turno trabalhado)', 'Colaborador compareceu; marcação não sincronizou'],
  ['Entrada 08:00 / Saída 16:00', 'Entrada 07:00 / Saída 15:00', 'Horário lançado incorretamente pelo posto'],
  ['Escala 12x36 - turno dia', 'Escala 12x36 - turno noite', 'Escala cadastrada com turno errado'],
  ['Posto: Portaria Principal', 'Posto: Portaria Lateral', 'Cobertura realizada em outro posto'],
  ['0 h extras', '4 h extras', 'Extensão de jornada autorizada e não lançada'],
  ['Sem adicional noturno', 'Adicional noturno (22h às 05h)', 'Adicional não considerado no fechamento'],
  ['FALTA INJUSTIFICADA', 'ATESTADO (1 dia)', 'Documento entregue após o fechamento'],
  ['Férias iniciando dia 10', 'Férias iniciando dia 17', 'Período ajustado a pedido da gestão'],
  ['Cargo: Vigilante', 'Cargo: Porteiro', 'Cargo cadastrado incorretamente'],
  ['CLIENTE DEMO 03', 'CLIENTE DEMO 05', 'Lotação lançada no contrato errado'],
  ['Informação X (demonstração)', 'Informação Y (demonstração)', 'Ajuste geral solicitado pelo supervisor']
];
/* [diasAtrás, supervisor, cliente(1-8), colaborador(1-25), tipo(0-10), status, responsável, horasAteCorrigir | comentário, extras] */
const LINHAS_DEMO = [
  [2, 'BRAVO I', 1, 1, 0, 'PENDENTE', '', 0, { occ: 3 }],
  [0, 'CHARLIE I', 2, 2, 1, 'PENDENTE'],
  [1, 'DELTA I', 3, 3, 4, 'PENDENTE'],
  [1, 'BRAVO II', 1, 4, 2, 'EM TRATATIVA', 'Analista Demo 1'],
  [2, 'ECO I', 4, 5, 5, 'PENDENTE'],
  [3, 'SIERRA I', 5, 6, 3, 'AGUARDANDO INFORMAÇÃO', 'Analista Demo 2', 'Aguardando comprovante do cliente'],
  [4, 'PAPA I', 6, 7, 6, 'PENDENTE'],
  [5, 'INDIA I', 7, 8, 7, 'EM TRATATIVA', 'Analista Demo 2'],
  [6, 'BRAVO III', 2, 9, 0, 'PENDENTE'],
  [7, 'CHARLIE II', 3, 10, 1, 'CORRIGIDO', 'Analista Demo 1', 5],
  [8, 'DELTA II', 8, 11, 8, 'CORRIGIDO', 'Analista Demo 3', 26],
  [9, 'BRAVO IV', 1, 12, 9, 'AGUARDANDO INFORMAÇÃO', 'Analista Demo 1', 'Aguardando confirmação do contrato'],
  [10, 'ECO II', 4, 13, 4, 'CORRIGIDO', 'Analista Demo 2', 3],
  [11, 'SIERRA II', 5, 14, 2, 'CORRIGIDO', 'Analista Demo 1', 52],
  [12, 'PAPA II', 6, 15, 10, 'CANCELADO', 'Analista Demo 3', 'Solicitação cancelada pelo supervisor (demonstração)'],
  [13, 'INDIA II', 7, 16, 1, 'CORRIGIDO', 'Analista Demo 3', 8],
  [14, 'BRAVO I', 1, 17, 5, 'CORRIGIDO', 'Analista Demo 1', 30],
  [15, 'CHARLIE I', 2, 18, 0, 'CORRIGIDO', 'Analista Demo 2', 4],
  [17, 'DELTA I', 3, 19, 3, 'EM TRATATIVA', 'Analista Demo 3'],
  [18, 'BRAVO II', 8, 20, 6, 'CORRIGIDO', 'Analista Demo 1', 72],
  [20, 'ECO I', 4, 21, 7, 'CORRIGIDO', 'Analista Demo 2', 6],
  [22, 'SIERRA I', 5, 22, 1, 'CANCELADO', 'Analista Demo 1', 'Duplicada com outra solicitação (demonstração)'],
  [24, 'PAPA I', 6, 23, 4, 'CORRIGIDO', 'Analista Demo 3', 10],
  [26, 'INDIA I', 7, 24, 2, 'CORRIGIDO', 'Analista Demo 2', 20],
  [0, 'BRAVO I', 1, 1, 0, 'DUPLICIDADE / VALIDAR', '', 0, { occ: 3, comentario: 'Exemplo de duplicidade: mesmo colaborador, cliente e data (demonstração).' }],
  [3, 'PAPA II', 6, 7, 6, 'PENDENTE', '', 0, { nome: 'COLABORADOR DEMO 07 - GRAFIA DIVERGENTE', obs: 'Exemplo de RE com nome divergente (demonstração).' }]
];
async function semearDemo() {
  const agora = Date.now(), recs = [], hist = [];
  LINHAS_DEMO.forEach((L, i) => {
    const [dias, sup, cli, col, tipoI, status, resp, extra, opc = {}] = L;
    const criado = new Date(agora - dias * 864e5 - (i * 37 + 30) * 60000);
    const iso = t => new Date(t).toISOString();
    const data = hojeISO(criado);
    const occ = opc.occ != null ? addDias(hojeISO(new Date(agora)), -opc.occ) : addDias(data, -1);
    const id = 'DEMO-' + String(i + 1).padStart(4, '0'), m = MODELOS_DEMO[tipoI];
    const rec = {
      id, data, supervisor: sup, gestao: sup.split(' ')[0], cliente: CONFIG.clientesSugeridos[cli - 1], re: '9000' + pad(col),
      colaborador: opc.nome || `COLABORADOR DEMO ${pad(col)}`, tipo: CONFIG.tipos[tipoI], dataOcorrencia: occ > data ? data : occ,
      lancada: m[0], correta: m[1], motivo: m[2], evidencia: 'DEMO - e-mail do supervisor', observacao: opc.obs || 'Registro fictício, apenas para demonstração.',
      status, responsavel: resp || '', solicitante: 'Supervisor Demo', criadoLogin: 'SUPERVISOR', criadoPerfil: 'SUPERVISOR', correcaoRealizada: '', corrigidoPor: '', criadoEm: iso(criado), criadoPor: 'Supervisor Demo', atualizadoEm: iso(criado), atualizadoPor: 'Supervisor Demo', concluidoEm: null, demo: true
    };
    const H = (quando, acao, campos, com, usuario = 'Supervisor Demo') => hist.push({ id: uid(), correcaoId: id, dataHora: iso(Math.min(quando, agora)), usuario, login: usuario === 'Supervisor Demo' ? 'SUPERVISOR' : 'CCO', perfil: usuario === 'Supervisor Demo' ? 'SUPERVISOR' : 'CCO', acao, campos, comentario: com || '' });
    H(criado.getTime(), 'CRIAÇÃO', [{ campo: 'Status', de: '', para: status === 'DUPLICIDADE / VALIDAR' ? status : 'PENDENTE' }], opc.comentario || 'Dados de demonstração');
    let ultimo = criado.getTime();
    if (status !== 'PENDENTE' && status !== 'DUPLICIDADE / VALIDAR') {
      const fimT = status === 'CORRIGIDO' ? criado.getTime() + extra * 3600e3 : criado.getTime() + 2 * 3600e3;
      const meio = criado.getTime() + Math.min(3600e3, (fimT - criado.getTime()) / 2);
      if (status === 'CANCELADO') {
        H(meio, 'ALTERAÇÃO DE STATUS', [{ campo: 'Status', de: 'PENDENTE', para: 'CANCELADO' }, { campo: 'Responsável', de: '', para: resp }], extra, resp); ultimo = Math.min(meio, agora);
      } else {
        H(meio, 'ALTERAÇÃO DE STATUS', [{ campo: 'Status', de: 'PENDENTE', para: 'EM TRATATIVA' }, { campo: 'Responsável', de: '', para: resp }], 'Início da tratativa', resp); ultimo = Math.min(meio, agora);
        if (status === 'AGUARDANDO INFORMAÇÃO') { H(fimT, 'ALTERAÇÃO DE STATUS', [{ campo: 'Status', de: 'EM TRATATIVA', para: status }], extra, resp); ultimo = Math.min(fimT, agora); }
        if (status === 'CORRIGIDO') { H(fimT, 'ALTERAÇÃO DE STATUS', [{ campo: 'Status', de: 'EM TRATATIVA', para: 'CORRIGIDO' }], 'Correção realizada (demonstração)', resp); ultimo = Math.min(fimT, agora); rec.concluidoEm = iso(ultimo); rec.correcaoRealizada = 'Ajuste realizado no sistema conforme solicitado (demonstração).'; rec.corrigidoPor = resp; }
      }
    }
    rec.atualizadoEm = iso(ultimo); rec.atualizadoPor = status === 'PENDENTE' || status === 'DUPLICIDADE / VALIDAR' ? 'Supervisor Demo' : resp;
    recs.push(rec);
  });
  await Repo.inserirLote(recs, hist);
  await Repo.gravarMeta({ demoInicializado: true });
}


/* ==========================================================================
   8b. SINCRONIZAÇÃO COM O SERVIDOR CENTRAL  (modo servidor)
   Quando o sistema é aberto pelo endereço do servidor (http://...:3000), todas as máquinas usam a MESMA base:
   - login e senha são conferidos no servidor; o servidor também aplica as permissões de cada perfil;
   - tudo o que é salvo fica primeiro nesta máquina (funciona sem internet) e entra numa FILA;
   - a fila é enviada ao servidor assim que houver conexão, e o servidor devolve o que os outros alteraram (a cada
     poucos segundos), então todos veem o mesmo dado quase em tempo real;
   - se duas pessoas alterarem o mesmo registro ao mesmo tempo, a segunda é avisada e refaz (nada é sobrescrito em silêncio).
   Abrindo o index.html direto do computador (file://), nada disso é usado: o sistema funciona só com a base local.
   ========================================================================== */
const Sync = (() => {
  const SK = CONFIG.prefixo + '.token';
  let servidor = false, token = null, online = true, ciclando = false, ultimoOk = '', ultimoErro = '', agendado = null;
  try { token = sessionStorage.getItem(SK); } catch (e) { /* ignora */ }

  const vazia = () => ({ seq: 0, correcoes: {}, historico: [], exclusoes: [], usuarios: null, auditoria: [] });
  const lerF = () => { const f = Repo.lerLocal('fila3', null); return f && f.correcoes ? f : vazia(); };
  const gravarF = f => Repo.gravarLocal('fila3', f);
  const copia = o => JSON.parse(JSON.stringify(o));
  const RAW = { salvarUsuarios: Repo.salvarUsuarios.bind(Repo) };

  async function api(rota, corpo, comToken = true, timeout = 20000) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), timeout);
    try {
      const r = await fetch(rota, { method: 'POST', cache: 'no-store', signal: ctl.signal,
        headers: { 'Content-Type': 'application/json', ...(comToken && token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(corpo || {}) });
      let j = null; try { j = await r.json(); } catch (e) { /* ignora */ }
      return { status: r.status, json: j };
    } finally { clearTimeout(t); }
  }

  /* ---- fila ---- */
  function agendar() { clearTimeout(agendado); agendado = setTimeout(sincronizar, 300); indicador(); }
  const doLogin = () => Auth.login;
  function enfileirarCorrecao(rec) {
    const f = lerF(), ant = f.correcoes[rec.id], local = Dados.correcoes.find(r => r.id === rec.id);
    f.seq++; f.correcoes[rec.id] = { rec: copia(rec), base: ant ? ant.base : (local ? local.atualizadoEm : null), login: doLogin(), seq: f.seq };
    gravarF(f); agendar();
  }
  function enfileirarExclusao(id) {
    const f = lerF(); delete f.correcoes[id]; f.seq++; f.exclusoes.push({ id, login: doLogin(), seq: f.seq }); gravarF(f); agendar();
  }
  function enfileirarHistorico(itens) {
    const f = lerF(); itens.forEach(h => { f.seq++; f.historico.push({ ...copia(h), seq: f.seq }); }); gravarF(f); agendar();
  }
  function enfileirarAuditoria(e) {
    if (['LOGIN', 'LOGIN_FALHA', 'LOGOUT'].includes(e.evento)) return;      // o servidor registra estes
    const f = lerF(); f.seq++; f.auditoria.push({ ...copia(e), login: doLogin(), seq: f.seq }); if (f.auditoria.length > 300) f.auditoria.splice(0, f.auditoria.length - 300);
    gravarF(f); agendar();
  }
  function enfileirarUsuarios() { const f = lerF(); f.usuarios = { login: doLogin() }; gravarF(f); agendar(); }

  function pendentes(login) {
    const f = lerF(), ok = x => !login || x.login === login;
    return Object.values(f.correcoes).filter(ok).length + f.historico.filter(ok).length + f.exclusoes.filter(ok).length
      + (f.usuarios && ok(f.usuarios) ? 1 : 0);
  }

  /* ---- indicador na barra superior ---- */
  function indicador() {
    const el = document.getElementById('sync-estado'); if (!el) return;
    if (!servidor || !Auth.logado) { el.hidden = true; return; }
    const n = pendentes(Auth.login); el.hidden = false;
    let cls, txt, dica;
    if (!online || !navigator.onLine) { cls = 'sync-off'; txt = `Sem conexão${n ? ' · ' + n + ' na fila' : ''}`; dica = 'Sem conexão com o servidor. Você pode continuar trabalhando: o que for salvo fica em fila e será enviado quando a rede voltar.'; }
    else if (n) { cls = 'sync-fila'; txt = `Enviando (${n})…`; dica = 'Enviando as alterações ao servidor.'; }
    else { cls = 'sync-ok'; txt = 'Sincronizado'; dica = ultimoOk ? 'Última atualização com o servidor: ' + fmtDataHora(ultimoOk) : ''; }
    el.className = 'sync ' + cls; el.textContent = '● ' + txt; el.title = dica + (ultimoErro && cls === 'sync-off' ? ' (' + ultimoErro + ')' : '');
  }

  /* ---- ciclo: envia a fila e recebe o estado atual ---- */
  async function sincronizar() {
    if (!servidor || !token || ciclando || !Auth.login) return;
    if (!navigator.onLine) { online = false; indicador(); return; }
    ciclando = true;
    const login = Auth.login;
    try {
      const f = lerF(), meu = x => x.login === login;
      const envC = Object.values(f.correcoes).filter(meu), envH = f.historico.filter(meu), envE = f.exclusoes.filter(meu), envA = f.auditoria.filter(meu);
      const envU = f.usuarios && meu(f.usuarios) ? copia(Dados.usuarios) : null;
      const { status, json } = await api('/api/sync', {
        correcoes: envC.map(x => ({ rec: x.rec, base: x.base })), historico: envH.map(({ seq, ...h }) => h), exclusoes: envE.map(x => x.id),
        auditoria: envA.map(({ seq, ...a }) => a), usuarios: envU });
      online = true; ultimoErro = '';
      if (status === 401) {
        token = null; try { sessionStorage.removeItem(SK); } catch (e) { /* ignora */ }
        sairDoSistema('SESSAO_EXPIRADA', 'Sua sessão no servidor expirou. Entre novamente — o que estava na fila será enviado.');
        return;
      }
      if (!json || !json.ok) throw new Error((json && json.erro) || 'resposta inválida do servidor');

      /* 1) tira da fila o que o servidor aceitou ou recusou (só se não foi alterado durante o envio) */
      const f2 = lerF(), aviso = [];
      const aceitos = json.aceitos || {}, rej = json.rejeitados || [];
      const rejPor = (t, id) => rej.find(r => r.tipo === t && r.id === id);
      envC.forEach(x => {
        const at = f2.correcoes[x.rec.id]; if (!at || at.seq !== x.seq) return;
        const r = rejPor('correcao', x.rec.id);
        if (aceitos.correcoes && aceitos.correcoes.includes(x.rec.id)) delete f2.correcoes[x.rec.id];
        else if (r) { delete f2.correcoes[x.rec.id]; aviso.push(r.motivo === 'CONFLITO' ? `A solicitação ${x.rec.id} foi alterada por outra pessoa enquanto você editava. Sua alteração NÃO foi aplicada: confira os dados atuais e refaça.` : `Alteração em ${x.rec.id} recusada pelo servidor: ${r.motivo}`); }
      });
      const idsH = new Set(envH.map(h => h.id)); f2.historico = f2.historico.filter(h => !(idsH.has(h.id) && (aceitos.historico || []).concat(rej.filter(r => r.tipo === 'historico').map(r => r.id)).includes(h.id)));
      rej.filter(r => r.tipo === 'exclusao').forEach(r => aviso.push(`Exclusão de ${r.id} recusada: ${r.motivo}`));
      const idsE = new Set(envE.map(x => x.id)); f2.exclusoes = f2.exclusoes.filter(x => !(idsE.has(x.id) && meu(x)));
      const seqA = new Set(envA.map(a => a.seq)); f2.auditoria = f2.auditoria.filter(a => !(meu(a) && seqA.has(a.seq)));
      if (envU) { f2.usuarios = null; const r = rej.find(x => x.tipo === 'usuarios'); if (r) aviso.push('Alteração de contas recusada: ' + r.motivo); }
      gravarF(f2);
      aviso.forEach(m => toast(m, 'aviso', 9000));

      /* 2) incorpora o estado do servidor (o que foi alterado por outras máquinas) */
      const est = json.estado, pend = new Set(Object.keys(f2.correcoes)), exc = new Set(f2.exclusoes.map(x => x.id));
      const locais = new Map(Dados.correcoes.map(r => [r.id, r])), remotos = new Set(est.correcoes.map(r => r.id));
      let mudou = false; const corr = [];
      est.correcoes.forEach(r => {
        if (exc.has(r.id)) return;
        if (pend.has(r.id)) { corr.push(locais.get(r.id) || r); return; }
        const l = locais.get(r.id); if (!l || JSON.stringify(l) !== JSON.stringify(r)) mudou = true;
        corr.push(r);
      });
      Dados.correcoes.forEach(l => { if (!remotos.has(l.id)) { if (pend.has(l.id)) corr.push(l); else mudou = true; } });
      const ids = new Set(Dados.historico.map(h => h.id)), novosH = est.historico.filter(h => !ids.has(h.id));
      if (novosH.length) mudou = true;
      const hist = Dados.historico.concat(novosH);
      Dados.correcoes = corr; Dados.historico = hist;
      if (!f2.usuarios && JSON.stringify(Dados.usuarios) !== JSON.stringify(est.usuarios)) { Dados.usuarios = est.usuarios; await RAW.salvarUsuarios(est.usuarios); mudou = true; }
      if (Auth.pode('usuarios.admin') && est.auditoria) { Dados.auditoria = est.auditoria.concat(f2.auditoria); await Repo.substituirAuditoria(Dados.auditoria); }
      await Repo.substituirTudo({ correcoes: corr, historico: hist, meta: Dados.meta });
      ultimoOk = json.agora || agoraISO();
      if (!Auth.valida()) { sairDoSistema('SESSAO_INVALIDA', 'Sua conta foi desativada ou removida.'); return; }
      if (mudou || aviso.length) {
        atualizarBadges(); atualizarAvisos();
        const ativo = document.activeElement, digitando = ativo && /^(INPUT|TEXTAREA|SELECT)$/.test(ativo.tagName);
        if (!Modal.aberto && viewAtual() !== 'nova' && !digitando) renderizar();
      }
    } catch (e) {
      online = false; ultimoErro = e.name === 'AbortError' ? 'tempo esgotado' : e.message;
    } finally { ciclando = false; indicador(); }
  }

  return {
    get servidor() { return servidor; },
    temToken: () => !!token,
    async detectar() {
      if (!/^https?:$/.test(location.protocol)) return false;
      try { const r = await fetch('/api/ping', { cache: 'no-store' }); const j = await r.json(); servidor = !!(j && j.ok && j.servidor === 'prosecurity-correcoes'); }
      catch (e) { servidor = false; }
      return servidor;
    },
    async entrar(login, senha) {
      if (!login || !senha) return { ok: false, erro: 'Informe o login e a senha.' };
      try {
        const { status, json } = await api('/api/login', { login, senha }, false, 15000);
        if (!json || !json.ok) return { ok: false, erro: (json && json.erro) || `Falha no servidor (${status}).` };
        token = json.token; try { sessionStorage.setItem(SK, token); } catch (e) { /* ignora */ }
        online = true; Dados.usuarios = [json.usuario];
        return { ok: true, usuario: json.usuario };
      } catch (e) { return { ok: false, erro: 'Sem conexão com o servidor. O login só funciona com a rede da empresa (Wi-Fi/cabo).' }; }
    },
    sincronizar, indicador, pendentes,
    /* Encerra a sessão no servidor e limpa os dados desta máquina (o que estiver na fila continua guardado). */
    async encerrar() {
      try { if (token) await api('/api/logout', {}, true, 4000); } catch (e) { /* ignora */ }
      token = null; try { sessionStorage.removeItem(SK); } catch (e) { /* ignora */ }
      Dados.correcoes = []; Dados.historico = []; Dados.usuarios = []; Dados.auditoria = [];
      await Repo.substituirTudo({ correcoes: [], historico: [], meta: Dados.meta }); await RAW.salvarUsuarios([]); await Repo.substituirAuditoria([]);
      indicador();
    },
    novoId() {
      const d = new Date(), p2 = n => String(n).padStart(2, '0'), a = new Uint32Array(1); crypto.getRandomValues(a);
      return `COR-${String(d.getFullYear()).slice(2)}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}-${a[0].toString(36).toUpperCase().padStart(4, '0').slice(-4)}`;
    },
    resumo() {
      if (!servidor) return 'Modo local (este computador). Para compartilhar entre máquinas, abra o sistema pelo endereço do servidor.';
      const n = pendentes(Auth.login);
      return `${online ? 'Conectado ao servidor' : 'SEM conexão com o servidor'} · ${n ? n + ' alteração(ões) na fila' : 'fila vazia'}${ultimoOk ? ' · última atualização ' + fmtDataHora(ultimoOk) : ''}`;
    },
    iniciar() {
      if (!servidor) return;
      window.addEventListener('online', () => { online = true; sincronizar(); });
      window.addEventListener('offline', () => { online = false; indicador(); });
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sincronizar(); });
      setInterval(() => { if (document.visibilityState === 'visible' && Auth.logado) sincronizar(); else indicador(); }, Math.max(3, Number(CONFIG.sincronizacaoSegundos) || 10) * 1000);
      /* liga a camada de dados à fila */
      const salvar = Repo.salvarCorrecao.bind(Repo), remover = Repo.removerCorrecao.bind(Repo), hist = Repo.adicionarHistorico.bind(Repo),
        usu = Repo.salvarUsuarios.bind(Repo), aud = Repo.adicionarAuditoria.bind(Repo);
      Repo.salvarCorrecao = async r => { enfileirarCorrecao(r); await salvar(r); };     // fila primeiro: 'base' precisa do registro ANTES da troca
      Repo.removerCorrecao = async id => { await remover(id); enfileirarExclusao(id); };
      Repo.adicionarHistorico = async itens => { await hist(itens); enfileirarHistorico(itens); };
      Repo.salvarUsuarios = async l => { await usu(l); enfileirarUsuarios(); };
      Repo.adicionarAuditoria = async e => { await aud(e); enfileirarAuditoria(e); };
      if (Auth.logado) sincronizar();
    }
  };
})();
/* ==========================================================================
   9. LOGIN, MENU, USUÁRIOS E ACESSOS, INICIALIZAÇÃO
   ========================================================================== */

/* ---------------- Menu (mostra só o que o perfil pode abrir) ---------------- */
function aplicarMenu() {
  $$('.nav a[data-view]').forEach(a => { a.hidden = !Auth.pode(PERM_VIEW[a.dataset.view]); });
  let houve = false, sep = null;
  Array.from($('.nav').children).forEach(el => {
    if (el.classList.contains('nav-sep')) { el.hidden = true; sep = el; }
    else if (!el.hidden) { if (sep && houve) sep.hidden = false; houve = true; sep = null; }
  });
  $('#btn-backup').hidden = !Auth.pode('backup');
  $('#usuario-nome').textContent = Auth.login || '';
  $('#chip-perfil').textContent = Auth.perfil || '';
  Sync.indicador();
  $('#rodape-modo').textContent = Sync.servidor ? 'Servidor central (dados compartilhados)' : 'Armazenamento local (localStorage)';
  $('#chip-conta').title = Auth.perfil ? `Conta ${Auth.login} · ${PERFIS[Auth.perfil].desc}` : '';
}
function abrirMenu() { $('#sidebar').classList.add('aberto'); $('#scrim').classList.add('aberto'); $('#menu-toggle').setAttribute('aria-expanded', 'true'); }
function fecharMenu() { $('#sidebar').classList.remove('aberto'); $('#scrim').classList.remove('aberto'); $('#menu-toggle').setAttribute('aria-expanded', 'false'); }

/* ---------------- Tela de login ---------------- */
function mostrarLogin(msg = '') {
  Modal.fecharTodos();
  $('.app').hidden = true; $('#toasts').innerHTML = '';
  main().innerHTML = ''; $('#avisos').innerHTML = '';
  document.title = 'Entrar — Correções Operacionais PROSECURITY';
  const t = $('#login-tela'); t.hidden = false;
  $('#lg-senha').value = '';
  const e = $('#lg-erro'); e.textContent = msg; e.hidden = !msg;
  e.className = 'lg-msg' + (msg && /saiu|inatividade/i.test(msg) ? ' lg-info' : '');
  (($('#lg-login').value ? $('#lg-senha') : $('#lg-login'))).focus();
}
function esconderLogin() { $('#login-tela').hidden = true; $('.app').hidden = false; }
async function tentarLogin(ev) {
  ev.preventDefault();
  const btn = $('#lg-ok'), e = $('#lg-erro');
  btn.disabled = true; btn.textContent = 'Verificando…';
  await new Promise(r => setTimeout(r, 30));           // deixa o botão atualizar antes do cálculo do hash
  const r = await Auth.entrar($('#lg-login').value, $('#lg-senha').value);
  if (r.ok && Sync.servidor) { btn.textContent = 'Carregando dados…'; await Sync.sincronizar(); }
  btn.disabled = false; btn.textContent = 'Entrar';
  if (!r.ok) { e.textContent = r.erro; e.hidden = false; e.className = 'lg-msg'; $('#lg-senha').value = ''; $('#lg-senha').focus(); return; }
  $('#lg-login').value = ''; $('#lg-senha').value = '';
  aplicarPrefsSessao(); esconderLogin();
  const ini = '#/' + PERFIS[Auth.perfil].inicio;
  if (location.hash === ini) renderizar(); else location.hash = ini;
}
async function sairDoSistema(evento = 'LOGOUT', msg = 'Você saiu do sistema.', perguntar = false) {
  if (Sync.servidor && perguntar && Sync.pendentes(Auth.login) > 0) {
    await Sync.sincronizar();
    const n = Sync.pendentes(Auth.login);
    if (n > 0) {
      const ok = await confirmar({ titulo: 'Alterações ainda não enviadas', perigo: true, textoConfirmar: 'Sair mesmo assim',
        mensagemHTML: `<p>Há <strong>${n}</strong> alteração(ões) aguardando envio ao servidor (sem conexão no momento).</p><p>Se sair agora, elas ficam guardadas nesta máquina e serão enviadas quando você entrar de novo <strong>com o mesmo login</strong>, com a rede funcionando.</p>` });
      if (!ok) return;
    }
  }
  Auth.sair(evento);
  Estado.edicaoId = null;
  if (Sync.servidor) await Sync.encerrar();
  mostrarLogin(msg);
}

/* ---------------- Usuários e acessos (somente MESTRE) ---------------- */
const optPerfis = sel => Object.keys(PERFIS).map(p => `<option value="${p}"${p === sel ? ' selected' : ''}>${p} — ${esc(PERFIS[p].desc)}</option>`).join('');
const campoPessoaHTML = id => `<label class="lbl" for="${id}">Responsável por esta ação (seu nome)</label>
  <input id="${id}" type="text" maxlength="60" list="dl-pessoas-adm" autocomplete="off" placeholder="Nome de quem está fazendo a alteração">
  <datalist id="dl-pessoas-adm">${pessoasDatalistOpcoes()}</datalist>`;
const pessoasDatalistOpcoes = () => Servico.pessoasConhecidas().map(x => `<option value="${esc(x)}">`).join('');

function renderUsuarios() {
  if (!guardar('usuarios.admin')) return;
  const lista = Contas.listar();
  const aud = Contas.auditoria(200);
  main().innerHTML = `<div class="page-head"><div><h1 tabindex="-1">Usuários e acessos</h1><p class="sub">Contas de acesso e níveis de permissão. As contas são compartilhadas: cada ação registra o nome da pessoa.</p></div>
      <button type="button" class="btn btn-primary" id="u-novo">${icone('plus')}Novo acesso</button></div>
    <section class="card tabela-card"><div class="tabela-wrap"><table class="tabela"><thead><tr><th scope="col"><div class="th-in">LOGIN</div></th><th scope="col"><div class="th-in">NÍVEL</div></th><th scope="col"><div class="th-in">DESCRIÇÃO</div></th><th scope="col"><div class="th-in">SITUAÇÃO</div></th><th scope="col"><div class="th-in">ÚLTIMA ALTERAÇÃO</div></th><th scope="col"><div class="th-in">AÇÕES</div></th></tr></thead>
      <tbody>${lista.map(u => `<tr>
        <td data-label="Login"><strong>${esc(u.login)}</strong>${u.login === Auth.login ? ' <span class="tag-demo">EM USO</span>' : ''}</td>
        <td data-label="Nível">${esc(u.perfil)}</td>
        <td data-label="Descrição">${esc(u.descricao)}</td>
        <td data-label="Situação">${u.ativo ? '<span class="tag-ativo">ATIVA</span>' : '<span class="tag-inativo">DESATIVADA</span>'}${u.senhaPadrao ? ' <span class="chip-atraso" title="A senha inicial ainda não foi trocada">SENHA INICIAL</span>' : ''}</td>
        <td data-label="Alteração" class="nowrap">${fmtDataHora(u.atualizadoEm)}<br><span class="muted">${esc(u.atualizadoPor)}</span></td>
        <td class="col-acoes" data-label="Ações"><button type="button" class="btn btn-sm" data-u="editar" data-l="${esc(u.login)}">Editar nível</button>
          <button type="button" class="btn btn-sm" data-u="senha" data-l="${esc(u.login)}">Redefinir senha</button>
          <button type="button" class="btn btn-sm" data-u="ativo" data-l="${esc(u.login)}">${u.ativo ? 'Desativar' : 'Ativar'}</button></td></tr>`).join('')}</tbody></table></div></section>
    <section class="card graf" style="margin-top:16px"><div class="graf-cab"><h2>Registro de acessos e tentativas negadas</h2><span class="nota">últimos ${aud.length} eventos</span></div>
      <div class="tabela-wrap" style="max-height:340px;overflow:auto"><table class="tabela-simples"><thead><tr><th>Data/hora</th><th>Evento</th><th>Conta</th><th>Pessoa</th><th>Detalhe</th></tr></thead>
      <tbody>${aud.map(a => `<tr><td class="nowrap">${fmtDataHora(a.dataHora)}</td><td><strong>${esc(a.evento)}</strong></td><td>${esc(a.login)}${a.perfil ? ' · ' + esc(a.perfil) : ''}</td><td>${esc(a.pessoa)}</td><td>${esc(a.detalhe)}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">Sem eventos.</td></tr>'}</tbody></table></div></section>`;
  $('#u-novo').onclick = abrirNovoAcesso;
  $$('[data-u]').forEach(b => b.onclick = () => {
    if (b.dataset.u === 'editar') abrirEditarAcesso(b.dataset.l);
    else if (b.dataset.u === 'senha') abrirSenhaAcesso(b.dataset.l);
    else abrirAtivoAcesso(b.dataset.l);
  });
}
async function executarAdm(m, fn, msgOk) {
  try { await fn(); m.fechar(); await recarregar(); toast(msgOk, 'ok'); }
  catch (e) { toast(e.message, 'erro'); }
}
function abrirNovoAcesso() {
  const m = Modal.abrir({ titulo: 'Novo acesso', largura: '520px', fecharNoFundo: false,
    corpo: `<label class="lbl" for="n-login">Login</label><input id="n-login" type="text" maxlength="20" autocomplete="off" data-foco>
      <label class="lbl" for="n-perfil">Nível de permissão</label><select id="n-perfil">${optPerfis('SUPERVISOR')}</select>
      <label class="lbl" for="n-desc">Descrição (opcional)</label><input id="n-desc" type="text" maxlength="80">
      <label class="lbl" for="n-s1">Senha (mínimo ${CONFIG.senhaMinimo} caracteres)</label><input id="n-s1" type="password" autocomplete="new-password">
      <label class="lbl" for="n-s2">Confirmar senha</label><input id="n-s2" type="password" autocomplete="new-password">
      ${campoPessoaHTML('n-pes')}`,
    rodape: '<button type="button" class="btn" data-fechar-x>Cancelar</button><button type="button" class="btn btn-primary" id="n-ok">Criar acesso</button>' });
  $('[data-fechar-x]', m.el).onclick = () => m.fechar();
  $('#n-ok', m.el).onclick = () => executarAdm(m, () => Contas.criar({ login: $('#n-login', m.el).value, perfil: $('#n-perfil', m.el).value, descricao: $('#n-desc', m.el).value,
    senha: $('#n-s1', m.el).value, senha2: $('#n-s2', m.el).value, pessoa: $('#n-pes', m.el).value }), 'Acesso criado.');
}
function abrirEditarAcesso(login) {
  const u = Dados.usuarios.find(x => x.login === login); if (!u) return;
  const m = Modal.abrir({ titulo: 'Editar acesso — ' + login, largura: '520px', fecharNoFundo: false,
    corpo: `<label class="lbl" for="e-perfil">Nível de permissão</label><select id="e-perfil" data-foco>${optPerfis(u.perfil)}</select>
      <label class="lbl" for="e-desc">Descrição</label><input id="e-desc" type="text" maxlength="80" value="${esc(u.descricao)}">
      ${campoPessoaHTML('e-pes')}`,
    rodape: '<button type="button" class="btn" data-fechar-x>Cancelar</button><button type="button" class="btn btn-primary" id="e-ok">Salvar</button>' });
  $('[data-fechar-x]', m.el).onclick = () => m.fechar();
  $('#e-ok', m.el).onclick = () => executarAdm(m, () => Contas.editar(login, { perfil: $('#e-perfil', m.el).value, descricao: $('#e-desc', m.el).value, pessoa: $('#e-pes', m.el).value }), 'Acesso atualizado.');
}
function abrirSenhaAcesso(login) {
  const m = Modal.abrir({ titulo: 'Redefinir senha — ' + login, largura: '480px', fecharNoFundo: false,
    corpo: `<label class="lbl" for="p-s1">Nova senha (mínimo ${CONFIG.senhaMinimo} caracteres)</label><input id="p-s1" type="password" autocomplete="new-password" data-foco>
      <label class="lbl" for="p-s2">Confirmar nova senha</label><input id="p-s2" type="password" autocomplete="new-password">
      ${campoPessoaHTML('p-pes')}`,
    rodape: '<button type="button" class="btn" data-fechar-x>Cancelar</button><button type="button" class="btn btn-primary" id="p-ok">Redefinir</button>' });
  $('[data-fechar-x]', m.el).onclick = () => m.fechar();
  $('#p-ok', m.el).onclick = () => executarAdm(m, () => Contas.redefinirSenha(login, $('#p-s1', m.el).value, $('#p-s2', m.el).value, $('#p-pes', m.el).value), 'Senha redefinida.');
}
function abrirAtivoAcesso(login) {
  const u = Dados.usuarios.find(x => x.login === login); if (!u) return;
  const novo = !u.ativo;
  const m = Modal.abrir({ titulo: (novo ? 'Ativar' : 'Desativar') + ' acesso — ' + login, largura: '480px', fecharNoFundo: false,
    corpo: `<p style="margin-bottom:10px">${novo ? 'A conta voltará a poder entrar no sistema.' : 'A conta será bloqueada imediatamente e não poderá mais entrar.'}</p>${campoPessoaHTML('a-pes')}`,
    rodape: `<button type="button" class="btn" data-fechar-x>Cancelar</button><button type="button" class="btn ${novo ? 'btn-primary' : 'btn-danger'}" id="a-ok">${novo ? 'Ativar' : 'Desativar'}</button>` });
  $('[data-fechar-x]', m.el).onclick = () => m.fechar();
  $('#a-ok', m.el).onclick = () => executarAdm(m, () => Contas.definirAtivo(login, novo, $('#a-pes', m.el).value), novo ? 'Acesso ativado.' : 'Acesso desativado.');
}

/* ---------------- Inicialização ---------------- */
async function iniciar() {
  $('#versao').textContent = CONFIG.versao;
  $$('.ico[data-ico]').forEach(s => { const t = document.createElement('div'); t.innerHTML = icone(s.dataset.ico); s.replaceWith(t.firstChild); });

  await Sync.detectar();
  await carregarDados();
  if (!Sync.servidor) {                              // modo local (arquivo aberto no computador)
    if (!Dados.usuarios.length) await Contas.semear();
    if (!Dados.meta.demoInicializado) await semearDemo();
    await Servico.migrar();
    await carregarDados();
  }

  window.addEventListener('hashchange', renderizar);
  $('#menu-toggle').onclick = () => $('#sidebar').classList.contains('aberto') ? fecharMenu() : abrirMenu();
  $('#scrim').onclick = fecharMenu;
  $('.nav').addEventListener('click', e => {
    const a = e.target.closest('a'); if (!a) return;
    if (a.dataset.view === 'nova') Estado.edicaoId = null;
    if (a.getAttribute('href') === location.hash) { e.preventDefault(); renderizar(); }
  });
  $('#btn-backup').onclick = abrirBackup;
  $('#btn-sair').onclick = () => sairDoSistema('LOGOUT', 'Você saiu do sistema.', true);
  $('#login-form').addEventListener('submit', tentarLogin);
  $('#lg-ver').onchange = e => { $('#lg-senha').type = e.target.checked ? 'text' : 'password'; };

  /* Inatividade e validade da sessão. */
  ['click', 'keydown', 'input', 'touchstart'].forEach(ev => document.addEventListener(ev, () => { if (Auth.logado) Auth.tocar(); }, true));
  setInterval(() => {
    if (!Auth.login) return;
    if (Auth.expirou()) sairDoSistema('SESSAO_EXPIRADA', `Sessão encerrada por inatividade (${CONFIG.sessaoMinutos} min). Entre novamente.`);
    else if (!Auth.valida()) sairDoSistema('SESSAO_INVALIDA', 'Sua conta foi desativada ou removida.');
  }, CONFIG.verificaSessaoMs);

  /* Outra aba alterou os dados: atualiza o cache e as telas. */
  window.addEventListener('storage', async e => {
    if (!e.key || !e.key.startsWith(CONFIG.prefixo) || e.key.includes('.pref.') || e.key.includes('.local.')) return;
    await carregarDados();
    if (Auth.login && !Auth.valida()) return sairDoSistema('SESSAO_INVALIDA', 'Sua conta foi desativada ou removida.');
    if (!Auth.logado) return;
    atualizarBadges();
    if (!Modal.aberto && viewAtual() !== 'nova') renderizar();
  });

  Sync.iniciar();
  if (Auth.restaurar()) { aplicarPrefsSessao(); esconderLogin(); renderizar(); if (Sync.servidor) Sync.sincronizar(); }
  else mostrarLogin('');
}
document.addEventListener('DOMContentLoaded', iniciar);
