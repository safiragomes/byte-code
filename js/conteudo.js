/* ============================================================================
   CONTEÚDO DO BYTE CODE  —  é aqui que você edita a cada período.
   Textos usam um markdown simples: **negrito**, *itálico*, `código`, [texto](url),
   listas com "- " e blocos de código com três crases.
   Blocos de lição (t): md | byte | callout | code | codigo | multi | quiz | widget | links | desafio
   ============================================================================ */
window.BYTE_CONFIG = {
  titulo: "Byte Code",
  capitulo: "Capítulo 7",
  subtitulo: "A Fase Secreta de Troia",
  disciplina: "Introdução à Programação · Monitoria",
  periodo: "2026.2",
  // Mude o prefixo a cada período para o histórico dos alunos começar do zero.
  storagePrefix: "bytecode.2026.2",
  // De onde o Python (Pyodide) é carregado, em ordem: cópia local (pasta pyodide/) e depois o CDN.
  pyodide: ["pyodide/", "https://cdn.jsdelivr.net/pyodide/v0.29.5/full/"],
  templateRepo: "https://github.com/safiracode/Game_Template",
  // Quantos erros no mesmo desafio até liberar "Ver solução".
  tentativasParaSolucao: 4,
  // Imagens opcionais (deixe "" para usar só emojis). Ex.: banner: "assets/mundo-pixel-banner.jpg", adesivosPasta: "assets/adesivos" (arquivos 1.png ... 8.png)
  imagens: { banner: "assets/mundo-pixel-banner.jpg", troia: "assets/troia.png", adesivosPasta: "assets/adesivos" }
};

/* ----- A nova aventura (capítulo 7). Edite livremente. ----- */
window.BYTE_HISTORIA = {
  chamada: "Byte achou algo no fundo do laboratório.",
  paragrafos: [
    "Ao reabrir o antigo laboratório do CIn, Byte tropeçou num cartucho empoeirado com a etiqueta `TROIA.EXE`. Troia nunca foi apagado: depois da batalha das listas de recursão, ele se escondeu num jogo inacabado, o **Mundo Pixel**, onde cada bug sem correção o deixa mais forte.",
    "Para entrar, Byte precisa encher a mochila com **8 adesivos de conhecimento**. Você é a pessoa monitora de confiança dele: aprenda cada conceito, conserte os bugs e, no fim, construa a sua própria fase do Mundo Pixel. Esse é o projeto final."
  ],
  fase3: "As fases construídas por turmas anteriores ficaram guardadas nos arquivos do Mundo Pixel. A sua entra na galeria."
};

window.BYTE_FASES = [
  { id: "f1", nome: "Aprendendo", resumo: "8 lições com código para rodar e mexer" },
  { id: "f2", nome: "Praticando", resumo: "5 bugs do Mundo Pixel para consertar" },
  { id: "f3", nome: "Fase Secreta", resumo: "O projeto final: do template ao seu jogo" }
];

/* ============================================================================
   LIÇÕES (Fase 1)
   ============================================================================ */
window.BYTE_LICOES = [

  /* ------------------------------------------------------------------ L1 */
  { id: "classe-objeto", num: 1, titulo: "Classe e Objeto", local: "Concha Acústica", adesivo: { nome: "Molde", emoji: "🧬" },
    resumo: "O molde e as coisas feitas com ele",
    diario: "O portal do Mundo Pixel abriu na Concha Acústica, onde tudo começou pra mim. Ele só deixa entrar quem sabe criar coisas a partir de um molde.",
    blocos: [
      { t: "md", md: "## O que é Programação Orientada a Objetos?\nÉ um jeito de organizar o código pensando em **coisas** (objetos) que têm **características** e fazem **ações**. Em um jogo isso é natural: o jogador, cada inimigo e cada moeda são coisas." },
      { t: "md", md: "## Classe é o molde, objeto é a coisa real\nPense na **ficha de cadastro** de um cachorro: ela diz que todo cachorro tem nome e idade, mas não é nenhum cachorro. A ficha é a **classe**. O Byte e o Rex, preenchidos nessa ficha, são **objetos** (também chamados de *instâncias*)." },
      { t: "code", id: "l1-a", titulo: "Seu primeiro molde", mem: true,
        codigo: "class Cachorro:\n    pass            # classe vazia: só o molde\n\nbyte = Cachorro()   # criando um objeto (instância)\nrex = Cachorro()    # outro objeto, do mesmo molde\n\nprint(type(byte))\nprint(isinstance(byte, Cachorro))\nprint(byte is rex)  # são o mesmo objeto?" },
      { t: "byte", mood: "feliz", md: "Repare na caixa **Memória do Byte** embaixo do código: ela mostra os objetos que existem depois de rodar. `byte` e `rex` saíram do mesmo molde, mas são coisas **diferentes**." },
      { t: "md", md: "**No projeto final:** no template do jogo, `Player`, `Enemy` e `Coin` são classes. Cada moeda desenhada na tela é um objeto `Coin` diferente." },
      { t: "callout", tipo: "dica", md: "Por convenção, nomes de classe começam com letra **maiúscula** (`Cachorro`, `GameObject`). Variáveis e funções usam minúscula (`byte`, `coletar_moeda`)." },
      { t: "quiz", id: "q1", pergunta: "Qual alternativa descreve melhor uma **classe**?",
        opcoes: ["Um objeto específico, como o Byte", "Um molde que descreve como os objetos serão", "Uma variável que guarda um texto", "Um arquivo terminado em .py"],
        certa: 1, explicacao: "A classe é o plano; o objeto é algo real construído com esse plano." },
      { t: "quiz", id: "q2", pergunta: "Depois de escrever `class Moeda:`, quantos objetos `Moeda` podemos criar?",
        opcoes: ["Só um", "Quantos quisermos", "No máximo dois", "Nenhum, até importarmos uma biblioteca"],
        certa: 1, explicacao: "Um molde serve para fazer quantas cópias você precisar: 3 moedas, 30 moedas..." },
      { t: "desafio", id: "d1" }
    ] },

  /* ------------------------------------------------------------------ L2 */
  { id: "atributos-metodos", num: 2, titulo: "Atributos e Métodos", local: "Laguinho", adesivo: { nome: "Barra de energia", emoji: "⚡" },
    resumo: "O que o objeto tem e o que ele faz",
    diario: "No Laguinho do Mundo Pixel, os patos-bug não ficam quietos. Para domar cada um preciso saber o que ele **tem** e o que ele **faz**.",
    blocos: [
      { t: "md", md: "## Atributos e métodos\n- **Atributos** são as características do objeto: o nome do Byte, a energia dele. São variáveis que moram **dentro** do objeto.\n- **Métodos** são as ações: latir, brincar. São funções que moram **dentro** da classe.\n- **`__init__`** é o método que prepara o objeto no momento em que ele nasce.\n- **`self`** é o próprio objeto que está executando o método." },
      { t: "code", id: "l2-a", titulo: "Cachorros com energia", mem: true,
        codigo: "class Cachorro:\n    def __init__(self, nome, energia):\n        self.nome = nome          # atributo\n        self.energia = energia    # atributo\n\n    def latir(self):              # método\n        print(f\"{self.nome}: Au au!\")\n\n    def brincar(self):            # método que muda o estado\n        self.energia -= 2\n        print(f\"{self.nome} brincou! Energia: {self.energia}\")\n\nbyte = Cachorro(\"Byte\", 10)\nrex = Cachorro(\"Rex\", 6)\n\nbyte.latir()\nbyte.brincar()\nbyte.brincar()\nrex.brincar()" },
      { t: "byte", mood: "curioso", md: "Mude a energia inicial do `rex` e rode de novo. Cada objeto guarda **os seus** valores: brincar com o Byte não cansa o Rex." },
      { t: "md", md: "## Quem é o `self`?\nQuando você escreve `byte.brincar()`, o Python na prática faz `Cachorro.brincar(byte)`: o objeto antes do ponto vira o primeiro parâmetro, o `self`. Teste aqui:" },
      { t: "widget", nome: "self" },
      { t: "md", md: "## Quebre de propósito\nErros fazem parte. O esquecimento mais comum é o `self`. Rode o código abaixo e leia o que o Byte diz; depois corrija." },
      { t: "code", id: "l2-b", titulo: "Algo está faltando aqui...", mem: false,
        codigo: "class Cachorro:\n    def __init__(self, nome):\n        self.nome = nome\n\n    def latir():\n        print(\"Au au!\")\n\nbyte = Cachorro(\"Byte\")\nbyte.latir()" },
      { t: "code", id: "l2-c", titulo: "Bônus: como o objeto aparece no print()", mem: false,
        codigo: "class Cachorro:\n    def __init__(self, nome):\n        self.nome = nome\n\n    def __str__(self):                 # texto usado pelo print()\n        return f\"Cachorro({self.nome})\"\n\nbyte = Cachorro(\"Byte\")\nprint(byte)" },
      { t: "callout", tipo: "dica", md: "Apague o método `__str__` do bônus e rode. Sem ele, o `print` mostra algo como `<__main__.Cachorro object at 0x...>`, que não ajuda ninguém a depurar." },
      { t: "quiz", id: "q1", pergunta: "Para que serve o `self` dentro de um método?",
        opcoes: ["É o nome fixo do primeiro objeto criado", "Referencia o próprio objeto que está chamando o método", "É uma palavra para criar classes", "Importa uma biblioteca"],
        certa: 1, explicacao: "`self` é o objeto antes do ponto: em `byte.latir()`, dentro de `latir` o `self` é o `byte`." },
      { t: "quiz", id: "q2", pergunta: "No `__init__`, o que faz a linha `self.energia = energia`?",
        opcoes: ["Cria um atributo `energia` no objeto", "Cria uma variável local que some quando o método termina", "Chama um método chamado energia", "Apaga o objeto"],
        certa: 0, explicacao: "Com o `self.`, o valor fica guardado **no objeto**. Sem ele (`energia = energia`) seria só uma variável local." },
      { t: "desafio", id: "d2" }
    ] },

  /* ------------------------------------------------------------------ L3 */
  { id: "encapsulamento", num: 3, titulo: "Encapsulamento", local: "Hospital das Clínicas", adesivo: { nome: "Cofre", emoji: "🔒" },
    resumo: "Dados protegidos, acesso controlado",
    diario: "Os prontuários do Hospital das Clínicas do Mundo Pixel estão sendo bagunçados pelos bugs. Só protegendo os dados dentro dos objetos eu consigo salvá-los.",
    blocos: [
      { t: "md", md: "## Um cofre para os dados\nEncapsular é **esconder** os dados do objeto e deixar que só os **métodos dele** os leiam ou alterem. Assim ninguém de fora coloca um valor sem sentido (como vida negativa) e a classe mantém tudo consistente.\n- `self.__senha` (dois underscores): atributo **privado**.\n- `self._ajuda` (um underscore): *protegido*, um aviso de “não mexa se não souber”." },
      { t: "code", id: "l3-a", titulo: "O cofre de petiscos", mem: true,
        codigo: "class CofreDePetiscos:\n    def __init__(self, senha, quantidade):\n        self.__senha = senha              # privado\n        self.__quantidade = quantidade    # privado\n\n    def abrir(self, tentativa):\n        if tentativa == self.__senha:\n            return f\"Aberto! Tem {self.__quantidade} petiscos.\"\n        return \"Senha errada! Byte está de olho.\"\n\ncofre = CofreDePetiscos(\"osso123\", 5)\nprint(cofre.abrir(\"1234\"))\nprint(cofre.abrir(\"osso123\"))" },
      { t: "byte", mood: "curioso", md: "Olhe a Memória do Byte: os atributos privados aparecem com um 🔒. Agora tente espiar a senha de fora e veja a resposta:" },
      { t: "code", id: "l3-b", titulo: "Tentando abrir o cofre à força", mem: false,
        codigo: "class CofreDePetiscos:\n    def __init__(self, senha):\n        self.__senha = senha\n\ncofre = CofreDePetiscos(\"osso123\")\nprint(cofre.__senha)" },
      { t: "md", md: "## Privado de verdade?\nNo Python o privado é um **combinado** reforçado: o nome é trocado por dentro (*name mangling*). Dá para dar a volta, mas fazer isso quebra o combinado." },
      { t: "code", id: "l3-c", titulo: "O nome escondido", mem: false,
        codigo: "class CofreDePetiscos:\n    def __init__(self, senha):\n        self.__senha = senha\n\ncofre = CofreDePetiscos(\"osso123\")\nprint([n for n in dir(cofre) if \"senha\" in n])\nprint(cofre._CofreDePetiscos__senha)   # funciona... mas é trapaça" },
      { t: "md", md: "## Por que isso importa em um jogo?\nA vida do jogador nunca deve ficar negativa nem passar do máximo. Se só um método mexe nela, a regra vale sempre:" },
      { t: "code", id: "l3-d", titulo: "Vida que respeita limites", mem: true,
        codigo: "class Vida:\n    def __init__(self, maximo):\n        self.__maximo = maximo\n        self.__atual = maximo\n\n    def levar_dano(self, dano):\n        self.__atual = max(0, self.__atual - dano)    # nunca abaixo de 0\n\n    def curar(self, valor):\n        self.__atual = min(self.__maximo, self.__atual + valor)\n\n    def atual(self):\n        return self.__atual\n\nhp = Vida(100)\nhp.levar_dano(130)\nprint(hp.atual())\nhp.curar(20)\nprint(hp.atual())" },
      { t: "quiz", id: "q1", pergunta: "O que `self.__senha` indica?",
        opcoes: ["Um atributo privado, que só a própria classe deve usar", "Uma senha criptografada", "Um método especial do Python", "Um atributo que só pode ser número"],
        certa: 0, explicacao: "Os dois underscores marcam o atributo como privado: de fora, `cofre.__senha` dá `AttributeError`." },
      { t: "quiz", id: "q2", pergunta: "Qual é a principal vantagem de proteger a vida do jogador dentro da classe?",
        opcoes: ["O código roda mais rápido", "As regras (ex.: nunca negativa) ficam num só lugar e valem sempre", "O Python exige isso", "Evita escrever `__init__`"],
        certa: 1, explicacao: "Com a regra dentro dos métodos, nenhum outro pedaço do jogo consegue quebrá-la sem querer." },
      { t: "desafio", id: "d3" }
    ] },

  /* ------------------------------------------------------------------ L4 */
  { id: "heranca-polimorfismo", num: 4, titulo: "Herança e Polimorfismo", local: "Ginásio", adesivo: { nome: "Árvore genealógica", emoji: "🧩" },
    resumo: "Reaproveitar código e variar comportamentos",
    diario: "No Ginásio, a torcida de bugs tem um ancestral comum, mas cada um grita de um jeito. Hora de entender a árvore genealógica do Troia.",
    blocos: [
      { t: "md", md: "## Herança\nUma classe pode **herdar** de outra e ganhar tudo o que ela tem, sem copiar código. A classe de cima é a **mãe** (base) e a de baixo é a **filha**. A filha ainda pode ter coisas só dela." },
      { t: "code", id: "l4-a", titulo: "Cachorro herda de Criatura", mem: true,
        codigo: "class Criatura:\n    def __init__(self, nome, vida):\n        self.nome = nome\n        self.vida = vida\n\n    def atacar(self):\n        return f\"{self.nome} ataca!\"\n\nclass Cachorro(Criatura):          # Cachorro herda de Criatura\n    def farejar(self):\n        return f\"{self.nome} farejou um bug!\"\n\nbyte = Cachorro(\"Byte\", 100)\nprint(byte.atacar())    # veio da mãe\nprint(byte.farejar())   # só do Cachorro" },
      { t: "md", md: "Explore a árvore do Troia: clique em uma classe para ver o que é **herdado**, o que é **próprio** e o que foi **sobrescrito**." },
      { t: "widget", nome: "heranca" },
      { t: "md", md: "## `super()`: reaproveitar e acrescentar\nQuando a filha sobrescreve um método, ela pode chamar o da mãe com `super()` para não repetir código. Só **substitua por completo** se o comportamento for mesmo diferente." },
      { t: "code", id: "l4-b", titulo: "super() em ação", mem: true,
        codigo: "class Criatura:\n    def __init__(self, nome, vida):\n        self.nome = nome\n        self.vida = vida\n\n    def atacar(self):\n        return f\"{self.nome} ataca!\"\n\nclass BugSelvagem(Criatura):\n    def __init__(self, nome):\n        super().__init__(nome, 30)          # reaproveita o __init__ da mãe\n        self.mordida = 5\n\n    def atacar(self):\n        return super().atacar() + \" Mordida de bug!\"   # mãe + algo novo\n\nclass Troia(Criatura):\n    def __init__(self):\n        super().__init__(\"Troia\", 500)\n\n    def atacar(self):                       # troca tudo (sem super)\n        return \"Caso base não encontrado... Stack overflow!\"\n\nbug = BugSelvagem(\"Bugzinho\")\ntroia = Troia()\nprint(bug.atacar())\nprint(troia.atacar())" },
      { t: "callout", tipo: "atencao", md: "Se a filha define o próprio `__init__`, o da mãe **não roda sozinho**. Chame `super().__init__(...)` na primeira linha, ou os atributos da mãe não existirão." },
      { t: "md", md: "## Polimorfismo\nSignifica “muitas formas”: o **mesmo método** (`atacar`) se comporta de jeitos diferentes conforme o objeto. Quem usa não precisa saber qual é qual, só chama." },
      { t: "code", id: "l4-c", titulo: "Mesma chamada, comportamentos diferentes", mem: true,
        codigo: "class Criatura:\n    def __init__(self, nome):\n        self.nome = nome\n\n    def atacar(self):\n        return f\"{self.nome} ataca!\"\n\nclass Byte(Criatura):\n    def atacar(self):\n        return f\"{self.nome} late alto: AU AU!\"\n\nclass Troia(Criatura):\n    def atacar(self):\n        return \"Troia relincha: stack overflow!\"\n\nturma = [Byte(\"Byte\"), Troia(\"Troia\"), Criatura(\"Bug\")]\nfor c in turma:            # a mesma linha serve para todos\n    print(c.atacar())" },
      { t: "quiz", id: "q1", pergunta: "O que `super().atacar()` faz dentro de uma classe filha?",
        opcoes: ["Cria um novo objeto", "Chama o método `atacar` da classe mãe", "Apaga o método da mãe", "Torna o método privado"],
        certa: 1, explicacao: "`super()` dá acesso à classe mãe, para reaproveitar o que ela já faz." },
      { t: "quiz", id: "q2", pergunta: "Em `for c in turma: print(c.atacar())`, por que cada `c` pode imprimir algo diferente?",
        opcoes: ["Porque o `for` embaralha a lista", "Porque cada classe sobrescreve `atacar` do seu jeito (polimorfismo)", "Porque `print` muda o texto", "Porque `turma` é privada"],
        certa: 1, explicacao: "O Python escolhe o `atacar` da classe real de cada objeto. Isso é polimorfismo." },
      { t: "desafio", id: "d4" }
    ] },

  /* ------------------------------------------------------------------ L5 */
  { id: "objetos-em-equipe", num: 5, titulo: "Objetos em Equipe", local: "Arena das Listas", adesivo: { nome: "Time", emoji: "🤝" },
    resumo: "Objetos recebendo objetos, listas e composição",
    diario: "Troia nasceu nas listas de recursão. Para enfrentá-lo de novo, meu time inteiro precisa conversar. Objetos conversando com objetos!",
    blocos: [
      { t: "md", md: "## Um jogo é feito de objetos que conversam\nEm projeto real, quase nada vive sozinho: o jogador coleta moedas, o inimigo encosta no jogador, a mochila guarda itens. Três padrões aparecem o tempo todo:\n- passar **um objeto** como argumento de um método;\n- guardar **vários objetos** numa lista e percorrê-la;\n- um objeto **dentro** de outro (composição)." },
      { t: "code", id: "l5-a", titulo: "Um objeto recebendo outro", mem: true,
        codigo: "class Bolinha:\n    def __init__(self):\n        self.mordidas = 0\n\nclass Cachorro:\n    def __init__(self, nome):\n        self.nome = nome\n        self.alegria = 0\n\n    def brincar_com(self, bolinha):      # recebe OUTRO objeto\n        bolinha.mordidas += 1\n        self.alegria += 5\n        print(f\"{self.nome} mordeu a bolinha ({bolinha.mordidas}x)\")\n\nbyte = Cachorro(\"Byte\")\nbola = Bolinha()\nbyte.brincar_com(bola)\nbyte.brincar_com(bola)" },
      { t: "code", id: "l5-b", titulo: "Lista de objetos (coleta de moedas, como no template)", mem: true,
        codigo: "class Moeda:\n    def __init__(self, x):\n        self.x = x\n\nmoedas = [Moeda(10), Moeda(40), Moeda(70)]\njogador_x = 40\ncoletadas = 0\n\nfor moeda in moedas[:]:           # [:] percorre uma CÓPIA da lista\n    if moeda.x == jogador_x:\n        moedas.remove(moeda)\n        coletadas += 1\n\nprint(\"coletadas:\", coletadas, \"| restantes:\", len(moedas))" },
      { t: "callout", tipo: "jogo", md: "No template, `Player.coin_collisions` usa exatamente esse `coins[:]`. Remover itens de uma lista **enquanto** você a percorre faz o Python pular elementos; percorrer a cópia evita o problema. Tente tirar o `[:]` e ver o linter do Byte reclamar." },
      { t: "code", id: "l5-c", titulo: "Composição: um objeto dentro de outro", mem: true,
        codigo: "class Item:\n    def __init__(self, nome, peso):\n        self.nome = nome\n        self.peso = peso\n\nclass Mochila:\n    def __init__(self):\n        self.itens = []\n\n    def guardar(self, item):\n        self.itens.append(item)\n\n    def peso_total(self):\n        return sum(i.peso for i in self.itens)\n\nclass Jogador:\n    def __init__(self, nome):\n        self.nome = nome\n        self.mochila = Mochila()     # um objeto DENTRO de outro\n\nbyte = Jogador(\"Byte\")\nbyte.mochila.guardar(Item(\"Petisco\", 1))\nbyte.mochila.guardar(Item(\"Bolinha\", 2))\nprint(byte.mochila.peso_total())" },
      { t: "quiz", id: "q1", pergunta: "Por que o `for` percorre `moedas[:]` quando vamos remover moedas?",
        opcoes: ["Porque `[:]` deixa o código mais rápido", "Remover da lista durante o `for` pula elementos; a cópia evita isso", "Porque o Python não deixa remover de listas", "Porque `[:]` ordena a lista"],
        certa: 1, explicacao: "O `for` percorre pelo índice. Se a lista encolhe no meio, o próximo elemento escapa. A cópia não muda durante o percurso." },
      { t: "quiz", id: "q2", pergunta: "Em `byte.mochila.guardar(item)`, quem é o `self` dentro de `guardar`?",
        opcoes: ["O `byte`", "O `item`", "A mochila do `byte`", "A classe `Mochila`"],
        certa: 2, explicacao: "O objeto antes do ponto do método é o `self`: aqui, `byte.mochila`." },
      { t: "desafio", id: "d5" }
    ] },

  /* ------------------------------------------------------------------ L6 */
  { id: "bibliotecas", num: 6, titulo: "Bibliotecas e Pygame", local: "Cinto de utilidades", adesivo: { nome: "Cinto de utilidades", emoji: "🧰" },
    resumo: "Código pronto, e o laço de um jogo",
    diario: "Ninguém constrói um mundo do zero. As bibliotecas são o meu cinto de utilidades: sorteios, contas e, no fim, o Pygame para desenhar tudo.",
    blocos: [
      { t: "md", md: "## Bibliotecas\nUma biblioteca é um conjunto de código pronto que você importa para não reinventar a roda.\n- **Biblioteca padrão** (já vem com o Python): `random`, `math`, `datetime`...\n- **De terceiros** (você instala com `pip install nome`): `pygame`, `requests`, `pytmx`...\n\nDuas formas de importar: `import random` (usa `random.choice(...)`) ou `from random import choice` (usa só `choice(...)`)." },
      { t: "code", id: "l6-a", titulo: "random: eventos imprevisíveis", mem: false,
        codigo: "import random\n\nmonstros = [\"Bugzinho\", \"Gremlin de Loop\", \"Troia\"]\nprint(\"Apareceu:\", random.choice(monstros))\nprint(\"Dado:\", random.randint(1, 6))" },
      { t: "code", id: "l6-b", titulo: "math e datetime", mem: false,
        codigo: "import math\nfrom datetime import datetime\n\nprint(math.sqrt(144), round(math.pi, 4))\nprint(\"Distância entre (0,0) e (3,4):\", math.hypot(3, 4))\nprint(datetime(2026, 11, 9).strftime(\"%d/%m/%Y\"))" },
      { t: "md", md: "## Pygame: o motor do seu jogo\nO **Pygame** desenha janelas, lê teclado/mouse, toca sons e controla o tempo. Ele abre uma janela de verdade, então **não roda aqui no navegador**: você vai testá-lo no seu computador (VS Code). Instale com `pip install pygame` (o `requirements.txt` do template já faz isso)." },
      { t: "codigo", titulo: "Um jogo mínimo (rode no seu computador)",
        codigo: "import pygame\n\npygame.init()\nscreen = pygame.display.set_mode((800, 600))\nclock = pygame.time.Clock()\n\nx = 100\nrunning = True\nwhile running:                       # o laço do jogo\n    clock.tick(60)                   # 60 quadros por segundo\n\n    for event in pygame.event.get(): # 1) eventos\n        if event.type == pygame.QUIT:\n            running = False\n\n    x += 2                           # 2) atualizar o estado\n\n    screen.fill((0, 0, 0))           # 3) desenhar\n    pygame.draw.rect(screen, (50, 120, 255), (x, 200, 50, 50))\n    pygame.display.update()\n\npygame.quit()" },
      { t: "md", md: "Todo jogo gira em torno de um **laço**: a cada quadro ele lê os eventos, atualiza os objetos e desenha. Brinque com uma versão simplificada do template e use o modo câmera lenta para ver cada etapa:" },
      { t: "widget", nome: "loop" },
      { t: "links", titulo: "Vídeos de apoio", itens: [
        { titulo: "Bibliotecas em Python", url: "https://www.youtube.com/watch?v=oOUyhGNib2Q", desc: "Vídeo de apoio" },
        { titulo: "Playlist de Pygame", url: "https://youtube.com/playlist?list=PLJ8PYFcmwFOxtJS4EZTGEPxMEo4YdbxdQ", desc: "Do primeiro quadrado até um jogo completo" }
      ] },
      { t: "quiz", id: "q1", pergunta: "O que `from random import choice` permite?",
        opcoes: ["Usar `choice(...)` direto, sem escrever `random.`", "Instalar a biblioteca random", "Criar uma classe chamada choice", "Importar o arquivo choice.py"],
        certa: 0, explicacao: "`from biblioteca import nome` traz só aquele nome para o seu código." },
      { t: "quiz", id: "q2", pergunta: "Qual é a ordem das etapas dentro do laço principal de um jogo?",
        opcoes: ["Desenhar, ler eventos, atualizar", "Ler eventos, atualizar objetos, desenhar", "Atualizar, desenhar, fechar", "Tanto faz, o Pygame reordena"],
        certa: 1, explicacao: "Primeiro entenda o que o jogador fez (eventos), depois mude o estado do jogo, e por fim desenhe o resultado." }
    ] },

  /* ------------------------------------------------------------------ L7 */
  { id: "modularizacao", num: 7, titulo: "Modularização", local: "Arquivos do Mundo", adesivo: { nome: "Mapa", emoji: "🗂️" },
    resumo: "Dividir o projeto em arquivos organizados",
    diario: "O código do Mundo Pixel está todo num arquivo de 3.000 linhas. Vou dividi-lo em módulos para o Troia não se esconder no meio da bagunça.",
    blocos: [
      { t: "md", md: "## Dividir para organizar\nModularizar é separar o código em **arquivos menores**, cada um com uma responsabilidade. Fica mais fácil de achar, de consertar e de dividir entre integrantes do grupo.\n\n```\nprojeto/\n├── criatura.py   ← a classe\n├── batalha.py    ← as regras do confronto\n└── main.py       ← junta tudo e roda\n```" },
      { t: "multi", id: "l7-a", titulo: "Três arquivos, um programa", entry: "main.py", mem: true, arquivos: [
        { nome: "criatura.py", codigo: "class Criatura:\n    def __init__(self, nome, habilidade):\n        self.nome = nome\n        self.habilidade = habilidade\n\n    def usar_habilidade(self):\n        print(f\"{self.nome} usou {self.habilidade}!\")\n" },
        { nome: "batalha.py", codigo: "def iniciar_batalha(heroi, vilao):\n    print(f\"Batalha: {heroi.nome} x {vilao.nome}!\")\n    heroi.usar_habilidade()\n    vilao.usar_habilidade()\n    print(\"Que vença o melhor!\")\n" },
        { nome: "main.py", codigo: "from criatura import Criatura\nfrom batalha import iniciar_batalha\n\nbyte = Criatura(\"Byte\", \"Latido Sônico\")\ntroia = Criatura(\"Troia\", \"Stack Overflow\")\n\niniciar_batalha(byte, troia)\n" }
      ] },
      { t: "byte", mood: "feliz", md: "Esses arquivos existem de verdade aqui dentro. Troque o nome em `from criatura import Criatura` por algo errado e veja o Byte explicar o `ImportError`." },
      { t: "md", md: "## Como o `import` encontra o arquivo\n- `from criatura import Criatura` procura o arquivo `criatura.py` e pega a classe `Criatura`. O nome do módulo é o do arquivo, **sem `.py`**.\n- Em pastas, o caminho vira ponto: `from classes.player import Player` lê `classes/player.py`.\n- Use nomes de arquivo em minúsculas, sem espaços nem acentos.\n- O `main.py` só **orquestra**: cria objetos e chama funções. A lógica mora nos outros arquivos." },
      { t: "codigo", titulo: "Assim o template do jogo importa tudo (main.py)",
        codigo: "from constants import BLACK, FPS, SCREEN_HEIGHT, SCREEN_WIDTH, WINDOW_TITLE\nfrom classes.player import Player\nfrom classes.enemy import Enemy\nfrom classes.coin import Coin\nfrom classes.text import Text\nfrom utils.collision import check_collision\n\n\ndef main():\n    ...   # o jogo começa aqui\n\n\nif __name__ == \"__main__\":   # só roda main() quando você executa este arquivo\n    main()" },
      { t: "callout", tipo: "atencao", md: "Cuidado com **import circular**: se `a.py` importa `b.py` e `b.py` importa `a.py`, o Python se perde. Regra de bolso: classes mais simples (como `GameObject`) não devem importar as mais específicas." },
      { t: "links", titulo: "Vídeo de apoio", itens: [{ titulo: "Modularização em Python", url: "https://youtu.be/eXytYiz-xhM", desc: "Vídeo de apoio" }] },
      { t: "quiz", id: "q1", pergunta: "Qual comando importa a classe `Player` do arquivo `classes/player.py`?",
        opcoes: ["import classes.player.py", "from classes.player import Player", "from player.py import classes", "include Player"],
        certa: 1, explicacao: "O caminho usa pontos no lugar de barras e não leva `.py`." },
      { t: "quiz", id: "q2", pergunta: "Qual deve ser o papel do `main.py`?",
        opcoes: ["Guardar toda a lógica do jogo", "Ser o ponto de entrada que junta as peças", "Guardar só imagens", "Substituir o `requirements.txt`"],
        certa: 1, explicacao: "O `main.py` organiza o funcionamento geral; as classes e funções ficam em seus próprios arquivos." }
    ] },

  /* ------------------------------------------------------------------ L8 */
  { id: "git-github", num: 8, titulo: "Git e GitHub", local: "Checkpoint", adesivo: { nome: "Checkpoint", emoji: "💾" },
    resumo: "Salvar versões e trabalhar em grupo",
    diario: "Todo bom jogo tem checkpoints. No mundo real eles se chamam commits, e o GitHub guarda todos.",
    blocos: [
      { t: "md", md: "## Git e GitHub: não são a mesma coisa\n- **Git** é a ferramenta que roda no seu computador e guarda o **histórico** do projeto, versão por versão (cada versão é um *commit*).\n- **GitHub** é o site que guarda uma cópia remota do seu repositório e deixa o grupo trabalhar junto.\n\nO ciclo básico é sempre o mesmo: **mexer nos arquivos → `add` → `commit` → `push`**." },
      { t: "md", md: "## Treine no terminal do Byte\nAqui vai um terminal de mentirinha, só com Git. Cumpra a missão de publicar o projeto; o Byte avisa quando você tropeçar." },
      { t: "widget", nome: "git" },
      { t: "codigo", titulo: "Cola dos comandos principais",
        codigo: "# Configurar usuário (uma vez só)\ngit config --global user.name \"Seu Nome\"\ngit config --global user.email \"seuemail@example.com\"\n\n# Baixar o template do jogo\ngit clone https://github.com/safiracode/Game_Template.git\n\n# Ou começar do zero\ngit init\n\n# Ver o que mudou\ngit status\n\n# Preparar arquivos para o commit\ngit add arquivo.py     # ou: git add .\n\n# Criar o commit (checkpoint)\ngit commit -m \"mensagem do commit\"\n\n# Conectar ao GitHub e enviar\ngit remote add origin https://github.com/usuario/repositorio.git\ngit push -u origin main\n\n# Baixar o que os colegas enviaram\ngit pull" },
      { t: "callout", tipo: "dica", md: "**Trabalhando em grupo:** dê `git pull` **antes** de começar e antes de enviar, e faça commits pequenos com mensagens que expliquem o que mudou (“adiciona inimigo”, e não “mudanças”). Se preferir, o **GitHub Desktop** faz tudo isso sem terminal." },
      { t: "callout", tipo: "atencao", md: "Crie um `.gitignore` com `__pycache__/`, `*.pyc`, `.venv/` e `.env`. Esses arquivos não devem ir para o repositório, e nunca versione senhas ou chaves." },
      { t: "links", titulo: "Vídeos de apoio", itens: [
        { titulo: "Git e GitHub do zero: guia completo", url: "https://www.youtube.com/watch?v=pyM5QLS2h6M", desc: "Fernanda Kipper. O que são Git e GitHub e os comandos principais" },
        { titulo: "Conceito de Git e GitHub", url: "https://www.youtube.com/watch?v=-l4Aa8wef8s", desc: "Comece por este para entender os comandos" },
        { titulo: "Git no VS Code", url: "https://www.youtube.com/watch?v=3-3gGSrWd00", desc: "Usando o Git pelo editor" }
      ] },
      { t: "quiz", id: "q1", pergunta: "Qual é a sequência correta para guardar uma mudança e enviá-la ao GitHub?",
        opcoes: ["push → commit → add", "add → commit → push", "commit → push → add", "add → push → commit"],
        certa: 1, explicacao: "`add` prepara os arquivos, `commit` cria o checkpoint local e `push` envia para o GitHub." },
      { t: "quiz", id: "q2", pergunta: "Um colega enviou mudanças ao GitHub. Como você as traz para o seu computador?",
        opcoes: ["git pull", "git init", "git add .", "git status"],
        certa: 0, explicacao: "`git pull` baixa e junta as novidades do repositório remoto." }
    ] }
];

/* ============================================================================
   FASE 3 — PROJETO (usado pela página “Fase Secreta”)
   ============================================================================ */
window.BYTE_PROJETO = {
  intro: "Aqui o Mundo Pixel passa a ser **seu**. O projeto final é um jogo em Python com Pygame, organizado como no template. Antes de abrir o editor, entenda como o template é montado.",
  spriteCodigo: "import os\nimport pygame\nfrom constants import IMAGES_PATH, PLAYER_WIDTH, PLAYER_HEIGHT\n\n# carregue UMA vez (por exemplo no __init__ do Player), depois do pygame.display.set_mode\nimagem = pygame.image.load(os.path.join(IMAGES_PATH, \"player.png\")).convert_alpha()\nimagem = pygame.transform.scale(imagem, (PLAYER_WIDTH, PLAYER_HEIGHT))\n\n# no draw():\nscreen.blit(imagem, (self.x, self.y))",
  ferramentas: [
    { titulo: "Pixilart", url: "https://www.pixilart.com/", desc: "Editor de pixel art no navegador: crie os sprites do jogador, inimigos e itens e exporte em PNG para `assets/images/`." },
    { titulo: "Tiled", url: "https://www.mapeditor.org/", desc: "Editor de mapas em tiles: monte as fases e exporte o mapa. Para carregá-lo no Pygame, muita gente usa a biblioteca `pytmx` (`pip install pytmx`)." }
  ],
  arvore: [
    { nome: "main.py", tipo: "arquivo", papel: "Ponto de entrada", conceito: "Orquestra",
      desc: "Cria a janela, os objetos e roda o laço principal: eventos → atualizar → desenhar. Não deve concentrar a lógica do jogo, só juntar as peças.",
      codigo: "import pygame\n\nfrom constants import BLACK, FPS, SCREEN_HEIGHT, SCREEN_WIDTH, WINDOW_TITLE\nfrom classes.player import Player\nfrom classes.enemy import Enemy\nfrom classes.coin import Coin\nfrom classes.text import Text\nfrom utils.collision import check_collision\n\n\ndef main():\n    pygame.init()\n    pygame.font.init()\n\n    screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))\n    pygame.display.set_caption(WINDOW_TITLE)\n    clock = pygame.time.Clock()\n\n    player = Player(100, 100)\n    enemy = Enemy(500, 300)\n    coin_counter = 0\n    coins = [Coin(400, 150), Coin(400, 250), Coin(400, 350)]\n    coins_display = Text(25, 25)\n\n    running = True\n    while running:\n        clock.tick(FPS)\n\n        for event in pygame.event.get():\n            if event.type == pygame.QUIT:\n                running = False\n\n        enemy.update()\n\n        if check_collision(player, enemy):\n            print(\"Collision detected!\")\n\n        screen.fill(BLACK)\n        for coin in coins:\n            coin.update(screen)\n\n        coin_counter = player.update(screen, coins, coin_counter)\n        enemy.draw(screen)\n        coins_display.display(screen, f\"Moedas: {coin_counter}\")\n\n        pygame.display.update()\n\n    pygame.quit()\n\n\nif __name__ == \"__main__\":\n    main()" },
    { nome: "constants.py", tipo: "arquivo", papel: "Valores fixos", conceito: "Constantes",
      desc: "Tamanho da tela, FPS, cores, velocidades e caminhos das pastas ficam num só lugar. Para mudar a tela, altere aqui e o resto do jogo acompanha.",
      codigo: "SCREEN_WIDTH = 800\nSCREEN_HEIGHT = 600\nFPS = 60\n\nWINDOW_TITLE = \"Python Game Template\"\n\nWHITE = (255, 255, 255)\nBLACK = (0, 0, 0)\nBLUE = (50, 120, 255)\nRED = (220, 50, 50)\nYELLOW = (255, 255, 0)\n\nIMAGES_PATH = \"assets/images\"\nSOUNDS_PATH = \"assets/sounds\"\nMUSIC_PATH = \"assets/music\"\n\nPLAYER_WIDTH = 50\nPLAYER_HEIGHT = 50\nPLAYER_SPEED = 5\n\nENEMY_WIDTH = 50\nENEMY_HEIGHT = 50\nENEMY_SPEED = 3\n\nCOIN_WIDTH = 25\nCOIN_HEIGHT = 25\n\nFONT_STYLE = \"Arial\"\nFONT_SIZE = 20" },
    { nome: "classes/", tipo: "pasta", papel: "Os objetos do jogo", conceito: "Classes e herança",
      desc: "Um arquivo por classe. `GameObject` é a mãe de tudo o que tem posição, tamanho e cor; `Player`, `Enemy` e `Coin` herdam dela.",
      filhos: [
        { nome: "game_object.py", tipo: "arquivo", papel: "Classe mãe", conceito: "Herança",
          desc: "Guarda posição, tamanho e cor, e sabe devolver o retângulo do objeto. Todos os outros reaproveitam isso com `super().__init__(...)`.",
          codigo: "class GameObject:\n    def __init__(self, x, y, width, height, color):\n        self.x = x\n        self.y = y\n        self.width = width\n        self.height = height\n        self.color = color\n\n    def get_rect(self):\n        return (self.x, self.y, self.width, self.height)" },
        { nome: "player.py", tipo: "arquivo", papel: "O jogador", conceito: "Herança, métodos, lista de objetos",
          desc: "Herda de `GameObject`. Lê o teclado, move-se sem sair da tela (`clamp`) e coleta moedas percorrendo uma cópia da lista (`coins[:]`).",
          codigo: "import pygame\n\nfrom constants import BLUE, PLAYER_HEIGHT, PLAYER_SPEED, PLAYER_WIDTH, SCREEN_HEIGHT, SCREEN_WIDTH\nfrom classes.game_object import GameObject\nfrom utils.collision import check_collision\nfrom utils.helpers import clamp\n\n\nclass Player(GameObject):\n    def __init__(self, x, y):\n        super().__init__(x, y, PLAYER_WIDTH, PLAYER_HEIGHT, BLUE)\n        self.speed = PLAYER_SPEED\n\n    def handle_movement(self):\n        dx = 0\n        dy = 0\n        keys = pygame.key.get_pressed()\n\n        if keys[pygame.K_LEFT]:\n            dx -= self.speed\n        if keys[pygame.K_RIGHT]:\n            dx += self.speed\n        if keys[pygame.K_UP]:\n            dy -= self.speed\n        if keys[pygame.K_DOWN]:\n            dy += self.speed\n\n        self.x = clamp(self.x + dx, 0, SCREEN_WIDTH - self.width)\n        self.y = clamp(self.y + dy, 0, SCREEN_HEIGHT - self.height)\n\n    def coin_collisions(self, coins, coin_counter):\n        for coin in coins[:]:\n            if check_collision(self, coin):\n                coin_counter += 1\n                coins.remove(coin)\n        return coin_counter\n\n    def draw(self, screen):\n        pygame.draw.rect(screen, self.color, self.get_rect())\n\n    def update(self, screen, coins, coin_counter):\n        self.handle_movement()\n        self.draw(screen)\n        coin_counter = self.coin_collisions(coins, coin_counter)\n        return coin_counter" },
        { nome: "enemy.py", tipo: "arquivo", papel: "O inimigo", conceito: "Herança",
          desc: "Também herda de `GameObject`. Anda para a direita e, ao sair da tela, reaparece do outro lado. Um bom ponto de partida para criar inimigos novos.",
          codigo: "import pygame\n\nfrom constants import ENEMY_HEIGHT, ENEMY_SPEED, ENEMY_WIDTH, RED, SCREEN_WIDTH\nfrom classes.game_object import GameObject\n\n\nclass Enemy(GameObject):\n    def __init__(self, x, y):\n        super().__init__(x, y, ENEMY_WIDTH, ENEMY_HEIGHT, RED)\n        self.speed = ENEMY_SPEED\n\n    def update(self):\n        self.x += self.speed\n\n        if self.x > SCREEN_WIDTH:\n            self.x = -self.width\n\n    def draw(self, screen):\n        pygame.draw.rect(screen, self.color, self.get_rect())" },
        { nome: "coin.py", tipo: "arquivo", papel: "A moeda", conceito: "Herança",
          desc: "O objeto coletável mais simples: herda tudo de `GameObject` e só sabe se desenhar.",
          codigo: "import pygame\nfrom classes.game_object import GameObject\n\nfrom constants import COIN_HEIGHT, COIN_WIDTH, YELLOW\n\nclass Coin(GameObject):\n    def __init__(self, x, y):\n        super().__init__(x, y, COIN_WIDTH, COIN_HEIGHT, YELLOW)\n\n    def update(self, screen):\n        pygame.draw.rect(screen, self.color, self.get_rect())" },
        { nome: "text.py", tipo: "arquivo", papel: "Texto na tela", conceito: "Classe de apoio",
          desc: "Encapsula a fonte, a cor e a posição para escrever o placar. Não herda de `GameObject` porque não tem tamanho nem colisão.",
          codigo: "import pygame\n\nfrom constants import FONT_SIZE, FONT_STYLE, WHITE\n\nclass Text:\n    def __init__(self, x, y):\n        self.x = x\n        self.y = y\n        self.size = FONT_SIZE\n        self.color = WHITE\n        self.style = FONT_STYLE\n\n    def display(self, screen, content):\n        font = pygame.font.SysFont(self.style, self.size)\n        text_surface = font.render(content, False, self.color)\n        screen.blit(text_surface, (self.x, self.y))" }
      ] },
    { nome: "utils/", tipo: "pasta", papel: "Funções de apoio", conceito: "Modularização",
      desc: "Funções que não pertencem a uma classe só, mas são usadas em vários lugares: colisão, limitar valores, carregar arquivos...",
      filhos: [
        { nome: "collision.py", tipo: "arquivo", papel: "Colisão", conceito: "Objetos conversando",
          desc: "Recebe **dois objetos** e diz se os retângulos deles se encostam. É a base para moeda, inimigo e parede.",
          codigo: "import pygame\n\n\ndef check_collision(object_a, object_b):\n    rect_a = pygame.Rect(object_a.get_rect())\n    rect_b = pygame.Rect(object_b.get_rect())\n\n    return rect_a.colliderect(rect_b)" },
        { nome: "helpers.py", tipo: "arquivo", papel: "Pequenas ajudas", conceito: "Funções",
          desc: "`clamp` mantém um valor entre um mínimo e um máximo. É assim que o jogador não sai da tela.",
          codigo: "def clamp(value, minimum, maximum):\n    if value < minimum:\n        return minimum\n\n    if value > maximum:\n        return maximum\n\n    return value" }
      ] },
    { nome: "assets/", tipo: "pasta", papel: "Imagens, sons e músicas", conceito: "Organização",
      desc: "Tudo que não é código: `images/` (sprites e fundos), `sounds/` (efeitos curtos como pulo e colisão) e `music/` (trilhas). Trocar uma imagem não exige mexer na lógica.",
      filhos: [] },
    { nome: "requirements.txt", tipo: "arquivo", papel: "Dependências", conceito: "Bibliotecas",
      desc: "Lista as bibliotecas do projeto. Quem clonar o repositório instala tudo com `pip install -r requirements.txt`.",
      codigo: "pygame" },
    { nome: ".gitignore", tipo: "arquivo", papel: "O que o Git ignora", conceito: "Git",
      desc: "Diz ao Git quais arquivos não enviar: caches do Python, ambientes virtuais e configurações locais.",
      codigo: "__pycache__/\n*.pyc\n.venv/\n.env" },
    { nome: "README.md", tipo: "arquivo", papel: "A porta de entrada", conceito: "Documentação",
      desc: "Explica o projeto. Atualize sempre que a estrutura mudar e, no seu jogo, inclua como rodar, os controles e quem fez.",
      codigo: "# Meu Jogo\n\nComo rodar:\n  pip install -r requirements.txt\n  python main.py\n\nControles: setas para mover\n\nIntegrantes: ..." }
  ]
};

/* ============================================================================
   RECURSOS (página “Recursos”)
   ============================================================================ */
window.BYTE_RECURSOS = [
  { grupo: "Praticar no Dikastis", itens: [
    { titulo: "Questão 1 — Classe e Objeto", url: "https://dikastis.com.br/problems/01KSP02HJBVW2739SDK6VBGZSN" },
    { titulo: "Questão 2 — Atributos e Métodos", url: "https://dikastis.com.br/problems/01KSP3H9YEVXCMGV151WXRNZ8A" },
    { titulo: "Questão 3 — Encapsulamento", url: "https://dikastis.com.br/problems/01KSP807WF1CA377GS8VTPVG64" },
    { titulo: "Questão 4 — Herança e Polimorfismo", url: "https://dikastis.com.br/problems/01KSQ5P8J6G1TR5ME0PM2HDC3Z" },
    { titulo: "Questão 5 — União de todos os conceitos", url: "https://dikastis.com.br/problems/01KT2QYD0PAJB4XYN3T8GH3HVZ" },
    { titulo: "DJ das Festas", url: "https://dikastis.cin.ufpe.br/problems/01GY8YMFZ0K8T7QFF5HDX3QYPP", desc: "Extra · Fácil" },
    { titulo: "Sonic: CIn Zone Act I", url: "https://dikastis.cin.ufpe.br/problems/01GE67JYB7WV3ZP38AMDYK0CB0", desc: "Extra · Média" },
    { titulo: "Torneio do Poder", url: "https://dikastis.cin.ufpe.br/problems/01GE0Z65PEB58HDPDRAABWD075", desc: "Extra · Média" }
  ] },
  { grupo: "Vídeos de apoio", itens: [
    { titulo: "Programação Orientada a Objetos", url: "https://www.youtube.com/watch?v=QAwNvlEd1aM" },
    { titulo: "Bibliotecas em Python", url: "https://www.youtube.com/watch?v=oOUyhGNib2Q" },
    { titulo: "Playlist de Pygame", url: "https://youtube.com/playlist?list=PLJ8PYFcmwFOxtJS4EZTGEPxMEo4YdbxdQ" },
    { titulo: "Modularização", url: "https://youtu.be/eXytYiz-xhM" },
    { titulo: "Conceito de Git e GitHub", url: "https://www.youtube.com/watch?v=-l4Aa8wef8s" },
    { titulo: "Git no VS Code", url: "https://www.youtube.com/watch?v=3-3gGSrWd00" },
    { titulo: "Git e GitHub do zero: guia completo", url: "https://www.youtube.com/watch?v=pyM5QLS2h6M", desc: "Fernanda Kipper" }
  ] },
  { grupo: "Arte e mapas do jogo", itens: [
    { titulo: "Pixilart", url: "https://www.pixilart.com/", desc: "Sprites em pixel art" },
    { titulo: "Tiled", url: "https://www.mapeditor.org/", desc: "Mapas em tiles" }
  ] },
  { grupo: "Projeto final", itens: [
    { titulo: "Template do jogo (GitHub)", url: "https://github.com/safiracode/Game_Template", desc: "Estrutura base do projeto" },
    { titulo: "Galeria de projetos (2023.1 a 2025.2)", url: "https://app.notion.com/p/Galeria-de-Projetos-2023-1-2024-2-240882df4e9380e4b058d96194ed1486", desc: "Inspiração: jogos de períodos anteriores" }
  ] }
];
