/* ============================================================================
   DESAFIOS (Fase 2 — Praticando)
   Cada desafio tem: enunciado, código inicial, exemplo de uso (roda junto com o
   ▶ Executar), requisitos estruturais (checados na AST), testes (Python), dicas
   progressivas e uma solução de referência.

   Dentro de "py" dos testes você tem:
     new('Classe', args...)      cria objeto com mensagem amigável se o __init__ estiver errado
     attr(obj, 'nome')           lê atributo/método com mensagem amigável se não existir
     call(obj.metodo, args...)   chama capturando print (ajuda a detectar print em vez de return)
     expect(obtido, esperado, 'o que foi testado')   compara com diferença explicada
     expect_true(cond, 'mensagem') / expect_false(cond, 'mensagem')
     cls('Classe')               pega a classe
     ns                          o namespace do código do aluno
   ============================================================================ */
window.BYTE_DESAFIOS = [

  /* ------------------------------------------------------------------ D1 */
  {
    id: "d1", num: 1, titulo: "A ficha do Byte", conceito: "Classe e Objeto", emoji: "🧬",
    dificuldade: "Aquecimento", xp: 50,
    dikastis: { titulo: "Questão 1 — Classe e Objeto", url: "https://dikastis.com.br/problems/01KSP02HJBVW2739SDK6VBGZSN" },
    historia: "Na entrada do Mundo Pixel, o portal só reconhece quem tem **ficha cadastrada**. Ajude o Byte a criar o molde de ficha de cachorro e cadastrar dois moradores.",
    tarefa: [
      "Crie a classe `Cachorro`.",
      "O `__init__` recebe `nome` e `idade` e guarda os dois como **atributos** do objeto.",
      "Crie o objeto `byte`, com nome `\"Byte\"` e idade `1`.",
      "Crie o objeto `rex`, com nome `\"Rex\"` e idade `4`."
    ],
    arquivo: "ficha.py",
    inicial: "# 1) Escreva a classe Cachorro aqui\n\n\n# 2) Crie os objetos byte e rex aqui\n",
    exemplo: "print(byte.nome, byte.idade)\nprint(rex.nome, rex.idade)",
    requires: { classes: [{ nome: "Cachorro", metodos: ["__init__"], init_params: ["nome", "idade"] }] },
    tests: [
      { id: "t1", nome: "Cachorro(\"Mel\", 3) guarda nome e idade",
        py: "c = new('Cachorro', 'Mel', 3)\nexpect(attr(c, 'nome'), 'Mel', 'c.nome')\nexpect(attr(c, 'idade'), 3, 'c.idade')",
        dica: "Dentro do `__init__`, escreva `self.nome = nome` e `self.idade = idade`." },
      { id: "t2", nome: "Cada objeto guarda os próprios dados",
        py: "a = new('Cachorro', 'A', 1)\nb = new('Cachorro', 'B', 2)\nexpect(a.nome, 'A', 'a.nome')\nexpect(b.nome, 'B', 'b.nome')\nexpect(a.idade, 1, 'a.idade')",
        dica: "Os atributos precisam começar com `self.` para ficarem no objeto — senão viram variáveis locais." },
      { id: "t3", nome: "Existe a variável `byte` (\"Byte\", 1)",
        py: "expect_true('byte' in ns, 'Não encontrei a variável `byte`. Crie o objeto no nível de fora da classe: byte = Cachorro(...)')\nexpect(ns['byte'].nome, 'Byte', 'byte.nome')\nexpect(ns['byte'].idade, 1, 'byte.idade')" },
      { id: "t4", nome: "Existe a variável `rex` (\"Rex\", 4)",
        py: "expect_true('rex' in ns, 'Não encontrei a variável `rex`.')\nexpect(ns['rex'].nome, 'Rex', 'rex.nome')\nexpect(ns['rex'].idade, 4, 'rex.idade')" }
    ],
    dicas: [
      "Uma classe começa com `class Cachorro:` e o `__init__` é o método que prepara cada objeto novo logo que ele é criado.",
      "Dentro do `__init__`, `self.nome = nome` guarda o valor **no objeto**. Faça o mesmo com a idade.",
      "Esqueleto:\n```\nclass Cachorro:\n    def __init__(self, nome, idade):\n        self.nome = ...\n        self.idade = ...\n\nbyte = Cachorro(\"Byte\", 1)\n```"
    ],
    solucao: "class Cachorro:\n    def __init__(self, nome, idade):\n        self.nome = nome\n        self.idade = idade\n\n\nbyte = Cachorro(\"Byte\", 1)\nrex = Cachorro(\"Rex\", 4)\n"
  },

  /* ------------------------------------------------------------------ D2 */
  {
    id: "d2", num: 2, titulo: "Energia do Byte", conceito: "Atributos e Métodos", emoji: "⚡",
    dificuldade: "Fácil", xp: 80,
    dikastis: { titulo: "Questão 2 — Atributos e Métodos", url: "https://dikastis.com.br/problems/01KSP3H9YEVXCMGV151WXRNZ8A" },
    historia: "Dentro do Mundo Pixel, cada ação cansa. Byte precisa de uma **barra de energia** que gasta ao brincar, recupera ao descansar e nunca passa dos limites.",
    tarefa: [
      "Crie a classe `Byte`. No `__init__` (sem parâmetros além do `self`), crie o atributo `energia` começando em `10`.",
      "Método `brincar()`: gasta **3** de energia, mas a energia **nunca fica abaixo de 0**.",
      "Método `descansar()`: recupera **4** de energia, mas **nunca passa de 10**.",
      "Método `status()`: **retorna** o texto `\"Energia: X/10\"` (com o valor atual no lugar do X)."
    ],
    arquivo: "energia.py",
    inicial: "class Byte:\n    pass  # escreva seu código aqui\n",
    exemplo: "b = Byte()\nb.brincar()\nb.brincar()\nprint(b.status())\nb.descansar()\nprint(b.status())",
    requires: { classes: [{ nome: "Byte", metodos: ["__init__", "brincar", "descansar", "status"] }] },
    tests: [
      { id: "t1", nome: "Começa com energia 10",
        py: "b = new('Byte')\nexpect(attr(b, 'energia'), 10, 'b.energia')",
        dica: "No `__init__`: `self.energia = 10`." },
      { id: "t2", nome: "brincar() gasta 3",
        py: "b = new('Byte')\nb.brincar()\nexpect(b.energia, 7, 'energia depois de 1 brincar()')\nb.brincar()\nexpect(b.energia, 4, 'energia depois de 2 brincar()')",
        dica: "Use `self.energia -= 3` (com o `self.`!)." },
      { id: "t3", nome: "A energia nunca fica negativa",
        py: "b = new('Byte')\nfor _ in range(5):\n    b.brincar()\nexpect(b.energia, 0, 'energia depois de 5 brincar() seguidos')",
        dica: "Depois de gastar, garanta o mínimo: `if self.energia < 0: self.energia = 0` (ou use `max(0, ...)`)." },
      { id: "t4", nome: "descansar() recupera 4",
        py: "b = new('Byte')\nb.energia = 2\nb.descansar()\nexpect(b.energia, 6, 'energia (começando em 2) depois de descansar()')" },
      { id: "t5", nome: "A energia nunca passa de 10",
        py: "b = new('Byte')\nb.energia = 8\nb.descansar()\nexpect(b.energia, 10, 'energia (começando em 8) depois de descansar()')\nb.descansar()\nexpect(b.energia, 10, 'energia depois de descansar() de novo')",
        dica: "Limite o máximo: `if self.energia > 10: self.energia = 10` (ou `min(10, ...)`)." },
      { id: "t6", nome: "status() retorna o texto certo",
        py: "b = new('Byte')\nexpect(call(b.status), 'Energia: 10/10', 'b.status()')\nb.brincar()\nb.brincar()\nexpect(call(b.status), 'Energia: 4/10', 'b.status() depois de 2 brincar()')",
        dica: "Use f-string: `return f\"Energia: {self.energia}/10\"`." }
    ],
    dicas: [
      "Atributos (como `energia`) ficam em `self.` e são criados no `__init__`. Métodos que **mudam** o estado, como `brincar`, não precisam de `return`.",
      "Para não passar dos limites, depois de somar/subtrair faça uma verificação com `if`. Ou use `max(0, valor)` e `min(10, valor)`.",
      "`status` é diferente: ele **devolve** (return) um texto — não imprime."
    ],
    solucao: "class Byte:\n    def __init__(self):\n        self.energia = 10\n\n    def brincar(self):\n        self.energia -= 3\n        if self.energia < 0:\n            self.energia = 0\n\n    def descansar(self):\n        self.energia += 4\n        if self.energia > 10:\n            self.energia = 10\n\n    def status(self):\n        return f\"Energia: {self.energia}/10\"\n"
  },

  /* ------------------------------------------------------------------ D3 */
  {
    id: "d3", num: 3, titulo: "Cofre de Petiscos", conceito: "Encapsulamento", emoji: "🔒",
    dificuldade: "Médio", xp: 100,
    dikastis: { titulo: "Questão 3 — Encapsulamento", url: "https://dikastis.com.br/problems/01KSP807WF1CA377GS8VTPVG64" },
    historia: "Os bugs do Mundo Pixel adoram roubar os petiscos do Byte. A solução é um **cofre**: a senha e a quantidade ficam escondidas, e só dá para mexer pelos métodos certos.",
    tarefa: [
      "Crie a classe `CofreDePetiscos` com `__init__(self, senha, petiscos)`.",
      "A senha e a quantidade de petiscos devem ser atributos **privados** (`__senha` e `__petiscos`). O cofre começa **trancado**.",
      "`tentar_abrir(senha)`: se a senha estiver certa, abre o cofre e **retorna** `\"Cofre aberto! Au au!\"`. Se errar, continua trancado e **retorna** `\"Senha errada! Byte está de olho.\"`.",
      "`pegar_petisco()`: se estiver trancado, retorna `\"O cofre está trancado.\"`. Se estiver aberto e sem petiscos, retorna `\"O cofre está vazio.\"`. Senão, tira 1 petisco e retorna `\"Nhac! Sobraram N.\"` (com N = quantos restaram).",
      "`esta_aberto()`: retorna `True` ou `False`."
    ],
    arquivo: "cofre.py",
    inicial: "class CofreDePetiscos:\n    pass  # escreva seu código aqui\n",
    exemplo: "cofre = CofreDePetiscos(\"osso123\", 2)\nprint(cofre.pegar_petisco())\nprint(cofre.tentar_abrir(\"1234\"))\nprint(cofre.tentar_abrir(\"osso123\"))\nprint(cofre.pegar_petisco())\nprint(cofre.esta_aberto())",
    requires: { classes: [{ nome: "CofreDePetiscos", metodos: ["__init__", "tentar_abrir", "pegar_petisco", "esta_aberto"],
      init_params: ["senha", "petiscos"], atributos_privados: ["__senha", "__petiscos"] }] },
    tests: [
      { id: "t1", nome: "A senha e os petiscos não ficam públicos",
        py: "c = new('CofreDePetiscos', 'osso123', 3)\nexpect_false(hasattr(c, 'senha'), 'A senha está pública (`c.senha` existe). Qualquer um poderia lê-la!', 'Use dois underscores: `self.__senha = senha`.')\nexpect_false(hasattr(c, 'petiscos'), 'A quantidade está pública (`c.petiscos` existe).', 'Use `self.__petiscos = petiscos`.')" },
      { id: "t2", nome: "Começa trancado",
        py: "c = new('CofreDePetiscos', 'osso123', 3)\nexpect(call(c.esta_aberto), False, 'c.esta_aberto() logo depois de criar')",
        dica: "Guarde o estado em um atributo privado, como `self.__aberto = False`." },
      { id: "t3", nome: "Senha errada continua trancado",
        py: "c = new('CofreDePetiscos', 'osso123', 3)\nexpect(call(c.tentar_abrir, 'errada'), 'Senha errada! Byte está de olho.', 'c.tentar_abrir(\"errada\")')\nexpect(call(c.esta_aberto), False, 'c.esta_aberto() depois da senha errada')" },
      { id: "t4", nome: "Senha certa abre",
        py: "c = new('CofreDePetiscos', 'osso123', 3)\nexpect(call(c.tentar_abrir, 'osso123'), 'Cofre aberto! Au au!', 'c.tentar_abrir(\"osso123\")')\nexpect(call(c.esta_aberto), True, 'c.esta_aberto() depois da senha certa')" },
      { id: "t5", nome: "Trancado não deixa pegar petisco",
        py: "c = new('CofreDePetiscos', 'osso123', 3)\nexpect(call(c.pegar_petisco), 'O cofre está trancado.', 'c.pegar_petisco() com o cofre trancado')" },
      { id: "t6", nome: "Pegar petisco com o cofre aberto",
        py: "c = new('CofreDePetiscos', 'osso123', 3)\nc.tentar_abrir('osso123')\nexpect(call(c.pegar_petisco), 'Nhac! Sobraram 2.', '1º pegar_petisco()')\nexpect(call(c.pegar_petisco), 'Nhac! Sobraram 1.', '2º pegar_petisco()')" },
      { id: "t7", nome: "Cofre vazio",
        py: "c = new('CofreDePetiscos', 'osso123', 1)\nc.tentar_abrir('osso123')\nexpect(call(c.pegar_petisco), 'Nhac! Sobraram 0.', 'pegar o último petisco')\nexpect(call(c.pegar_petisco), 'O cofre está vazio.', 'pegar de um cofre já vazio')",
        dica: "Antes de tirar, confira se `self.__petiscos` ainda é maior que 0." },
      { id: "t8", nome: "Dois cofres não se misturam",
        py: "a = new('CofreDePetiscos', 'a', 1)\nb = new('CofreDePetiscos', 'b', 1)\nexpect(call(a.tentar_abrir, 'b'), 'Senha errada! Byte está de olho.', 'cofre A aberto com a senha do B')\nexpect(call(b.tentar_abrir, 'b'), 'Cofre aberto! Au au!', 'cofre B com a própria senha')" }
    ],
    dicas: [
      "Dois underscores no começo do nome (`self.__senha`) deixam o atributo privado: só os métodos da própria classe conseguem usá-lo.",
      "Você vai precisar de **três** dados privados: `__senha`, `__petiscos` e `__aberto` (começa em `False`).",
      "No `pegar_petisco`, teste na ordem: primeiro se está trancado, depois se está vazio, e só então tire o petisco."
    ],
    solucao: "class CofreDePetiscos:\n    def __init__(self, senha, petiscos):\n        self.__senha = senha\n        self.__petiscos = petiscos\n        self.__aberto = False\n\n    def tentar_abrir(self, senha):\n        if senha == self.__senha:\n            self.__aberto = True\n            return \"Cofre aberto! Au au!\"\n        return \"Senha errada! Byte está de olho.\"\n\n    def pegar_petisco(self):\n        if not self.__aberto:\n            return \"O cofre está trancado.\"\n        if self.__petiscos == 0:\n            return \"O cofre está vazio.\"\n        self.__petiscos -= 1\n        return f\"Nhac! Sobraram {self.__petiscos}.\"\n\n    def esta_aberto(self):\n        return self.__aberto\n"
  },

  /* ------------------------------------------------------------------ D4 */
  {
    id: "d4", num: 4, titulo: "A família de Troia", conceito: "Herança e Polimorfismo", emoji: "🧩",
    dificuldade: "Médio", xp: 120,
    dikastis: { titulo: "Questão 4 — Herança e Polimorfismo", url: "https://dikastis.com.br/problems/01KSQ5P8J6G1TR5ME0PM2HDC3Z" },
    historia: "Todos os inimigos do Mundo Pixel descendem de um mesmo molde, mas cada um ataca do seu jeito. Os bugs comuns **reaproveitam** o ataque básico; **Troia.EXE** troca tudo por um ataque próprio.",
    tarefa: [
      "Classe mãe `Inimigo`: `__init__(self, nome)` guarda o `nome`; o método `atacar()` **retorna** `\"Ataque genérico!\"`.",
      "Classe `BugSelvagem`, que **herda** de `Inimigo`. Sobrescreva `atacar()` usando `super().atacar()` e acrescente `\" Mordida de bug!\"` ao final (note o espaço antes da palavra).",
      "Classe `Troia`, que também herda de `Inimigo`. Sobrescreva `atacar()` **por completo** (sem `super`) retornando `\"Caso base não encontrado... Stack overflow!\"`.",
      "Não é preciso escrever `__init__` nas filhas: elas herdam o da mãe."
    ],
    arquivo: "familia.py",
    inicial: "class Inimigo:\n    pass  # escreva a classe mãe aqui\n\n\n# class BugSelvagem(...):\n\n\n# class Troia(...):\n",
    exemplo: "inimigos = [Inimigo(\"Genérico\"), BugSelvagem(\"Bugzinho\"), Troia(\"Troia\")]\nfor i in inimigos:\n    print(i.nome, \"->\", i.atacar())",
    requires: { classes: [
      { nome: "Inimigo", metodos: ["__init__", "atacar"], init_params: ["nome"] },
      { nome: "BugSelvagem", herda: "Inimigo", metodos: ["atacar"], usa_super: ["atacar"] },
      { nome: "Troia", herda: "Inimigo", metodos: ["atacar"], sem_super: ["atacar"] } ] },
    tests: [
      { id: "t1", nome: "Inimigo guarda o nome e ataca de forma genérica",
        py: "i = new('Inimigo', 'X')\nexpect(attr(i, 'nome'), 'X', 'i.nome')\nexpect(call(i.atacar), 'Ataque genérico!', 'Inimigo.atacar()')" },
      { id: "t2", nome: "BugSelvagem herda o `nome` da mãe",
        py: "expect_true(issubclass(cls('BugSelvagem'), cls('Inimigo')), '`BugSelvagem` precisa herdar de `Inimigo`: class BugSelvagem(Inimigo):')\nb = new('BugSelvagem', 'Bugzinho')\nexpect(attr(b, 'nome'), 'Bugzinho', 'b.nome')" },
      { id: "t3", nome: "BugSelvagem.atacar() = mãe + mordida",
        py: "b = new('BugSelvagem', 'Bugzinho')\nexpect(call(b.atacar), 'Ataque genérico! Mordida de bug!', 'BugSelvagem.atacar()')",
        dica: "`return super().atacar() + \" Mordida de bug!\"` — repare no espaço antes de `Mordida`." },
      { id: "t4", nome: "Troia ataca do seu jeito",
        py: "expect_true(issubclass(cls('Troia'), cls('Inimigo')), '`Troia` precisa herdar de `Inimigo`.')\nt = new('Troia', 'Troia')\nexpect(call(t.atacar), 'Caso base não encontrado... Stack overflow!', 'Troia.atacar()')" },
      { id: "t5", nome: "Polimorfismo: a mesma chamada, comportamentos diferentes",
        py: "lista = [new('Inimigo', 'a'), new('BugSelvagem', 'b'), new('Troia', 't')]\nsaida = [call(x.atacar) for x in lista]\nexpect(saida, ['Ataque genérico!', 'Ataque genérico! Mordida de bug!', 'Caso base não encontrado... Stack overflow!'], '[x.atacar() for x in lista]')" }
    ],
    dicas: [
      "Herança se declara entre parênteses na primeira linha: `class BugSelvagem(Inimigo):`.",
      "`super().atacar()` chama a versão da mãe e **devolve** o texto dela. Você pode somar mais texto: `super().atacar() + \" ...\"`.",
      "Em `Troia`, não use `super()`: apenas `return` do texto novo. É isso que chamamos de sobrescrever por completo."
    ],
    solucao: "class Inimigo:\n    def __init__(self, nome):\n        self.nome = nome\n\n    def atacar(self):\n        return \"Ataque genérico!\"\n\n\nclass BugSelvagem(Inimigo):\n    def atacar(self):\n        return super().atacar() + \" Mordida de bug!\"\n\n\nclass Troia(Inimigo):\n    def atacar(self):\n        return \"Caso base não encontrado... Stack overflow!\"\n"
  },

  /* ------------------------------------------------------------------ D5 */
  {
    id: "d5", num: 5, titulo: "Ataque coordenado", conceito: "União de todos os conceitos", emoji: "🛡️",
    dificuldade: "Desafio", xp: 150,
    dikastis: { titulo: "Questão 5 — União de todos os conceitos", url: "https://dikastis.com.br/problems/01KT2QYD0PAJB4XYN3T8GH3HVZ" },
    historia: "Troia.EXE está no centro do Mundo Pixel e uma pessoa só não derruba. Byte reúne os **monitores** e todos atacam juntos: a soma dos poderes tem que vencer a defesa dele.",
    tarefa: [
      "A classe `Inimigo` já está pronta no código inicial (herança!).",
      "Crie a classe `Monitor` com `__init__(self, nome, poder)`, guardando os dois atributos.",
      "Crie a classe `Troia`, que **herda** de `Inimigo`. O `__init__` recebe só `defesa`, chama `super().__init__(\"Troia\")` e guarda a defesa em um atributo **privado** `__defesa`.",
      "Em `Troia`, crie `receber_ataque_coordenado(lista_de_monitores)`: some o `poder` de **todos** os monitores da lista. Se a soma for **maior ou igual** à defesa, retorne `\"Sucesso! Troia recuou para as sombras.\"`. Senão, retorne `\"Falha... Troia ficou mais forte.\"`."
    ],
    arquivo: "ataque.py",
    inicial: "class Inimigo:\n    def __init__(self, nome):\n        self.nome = nome\n\n    def atacar(self):\n        return \"Ataque genérico!\"\n\n\n# class Monitor:\n\n\n# class Troia(Inimigo):\n",
    exemplo: "byte = Monitor(\"Byte\", 100)\nana = Monitor(\"Ana\", 60)\ntroia = Troia(150)\nprint(troia.receber_ataque_coordenado([byte, ana]))\nprint(troia.receber_ataque_coordenado([byte]))",
    requires: { classes: [
      { nome: "Monitor", metodos: ["__init__"], init_params: ["nome", "poder"] },
      { nome: "Troia", herda: "Inimigo", metodos: ["__init__", "receber_ataque_coordenado"], init_params: ["defesa"],
        usa_super: ["__init__"], atributos_privados: ["__defesa"] } ] },
    tests: [
      { id: "t1", nome: "Monitor guarda nome e poder",
        py: "m = new('Monitor', 'Ana', 60)\nexpect(attr(m, 'nome'), 'Ana', 'm.nome')\nexpect(attr(m, 'poder'), 60, 'm.poder')" },
      { id: "t2", nome: "Troia herda o nome da mãe via super()",
        py: "t = new('Troia', 150)\nexpect(attr(t, 'nome'), 'Troia', 't.nome')",
        dica: "No `__init__` de `Troia`: `super().__init__(\"Troia\")`." },
      { id: "t3", nome: "Troia herda `atacar()`",
        py: "t = new('Troia', 150)\nexpect(call(t.atacar), 'Ataque genérico!', 't.atacar()')" },
      { id: "t4", nome: "A defesa é privada",
        py: "t = new('Troia', 150)\nexpect_false(hasattr(t, 'defesa'), 'A defesa está pública (`t.defesa` existe).', 'Use `self.__defesa = defesa`.')" },
      { id: "t5", nome: "Soma dos poderes vence a defesa",
        py: "t = new('Troia', 150)\nlista = [new('Monitor', 'Byte', 100), new('Monitor', 'Ana', 60)]\nexpect(call(t.receber_ataque_coordenado, lista), 'Sucesso! Troia recuou para as sombras.', '100 + 60 contra defesa 150')" },
      { id: "t6", nome: "Soma igual à defesa também vence (>=)",
        py: "t = new('Troia', 160)\nlista = [new('Monitor', 'Byte', 100), new('Monitor', 'Ana', 60)]\nexpect(call(t.receber_ataque_coordenado, lista), 'Sucesso! Troia recuou para as sombras.', '100 + 60 contra defesa 160')",
        dica: "A condição é \"maior **ou igual**\": `soma >= self.__defesa`." },
      { id: "t7", nome: "Soma menor falha",
        py: "t = new('Troia', 200)\nlista = [new('Monitor', 'Byte', 100), new('Monitor', 'Ana', 60)]\nexpect(call(t.receber_ataque_coordenado, lista), 'Falha... Troia ficou mais forte.', '100 + 60 contra defesa 200')" },
      { id: "t8", nome: "Lista vazia falha e a lista não é alterada",
        py: "t = new('Troia', 1)\nvazia = []\nexpect(call(t.receber_ataque_coordenado, vazia), 'Falha... Troia ficou mais forte.', 'lista vazia')\nlista = [new('Monitor', 'Byte', 10)]\nt.receber_ataque_coordenado(lista)\nexpect(len(lista), 1, 'tamanho da lista depois do ataque')" }
    ],
    dicas: [
      "Para somar poderes, percorra a lista: `for monitor in lista_de_monitores:` e acumule `monitor.poder` em uma variável (começando em 0).",
      "A defesa precisa ser privada **e** estar disponível no método: `self.__defesa` funciona dentro de qualquer método da própria classe `Troia`.",
      "Fluxo do método: some os poderes → compare com `self.__defesa` → `return` a mensagem certa."
    ],
    solucao: "class Inimigo:\n    def __init__(self, nome):\n        self.nome = nome\n\n    def atacar(self):\n        return \"Ataque genérico!\"\n\n\nclass Monitor:\n    def __init__(self, nome, poder):\n        self.nome = nome\n        self.poder = poder\n\n\nclass Troia(Inimigo):\n    def __init__(self, defesa):\n        super().__init__(\"Troia\")\n        self.__defesa = defesa\n\n    def receber_ataque_coordenado(self, lista_de_monitores):\n        soma = 0\n        for monitor in lista_de_monitores:\n            soma += monitor.poder\n        if soma >= self.__defesa:\n            return \"Sucesso! Troia recuou para as sombras.\"\n        return \"Falha... Troia ficou mais forte.\"\n"
  }
];
