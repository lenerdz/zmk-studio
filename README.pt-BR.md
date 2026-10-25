# ZMK Studio (fork não oficial)

[English](README.md) | Português (Brasil)

Este é um fork não oficial do [ZMK Studio](https://github.com/zmkfirmware/zmk-studio),
o app web que edita ao vivo o keymap de um teclado [ZMK](https://zmk.dev/). Ele é
mantido por [lenerdz](https://github.com/lenerdz) para um teclado Corne.

Ele **não** é o ZMK Studio oficial e **não** é endossado pelo ZMK Project. O nome e o
logotipo do ZMK são do ZMK Project: permanecem neste fork apenas porque ele é uma
cópia modificada do app. Para obter ajuda com o app oficial, procure o ZMK Project.

**Para usar:** <https://lenerdz.github.io/zmk-studio/>

## O que muda em relação ao upstream

O upstream desenha cada tecla como o nome do comportamento (pequeno, em cima) e o
primeiro parâmetro do binding como um uso HID (embaixo). Isso está certo para teclas
comuns, mas para qualquer comportamento cujos parâmetros não sejam usos HID (perfis
Bluetooth, comandos de iluminação, camadas por número, ...) a tecla fica vazia ou mostra
um rótulo sem sentido.

Este fork desenha, nessas teclas, um ícone e um rótulo curto. Passar o mouse sobre uma
tecla mostra a descrição completa (por exemplo, `Bluetooth: Select Profile 2`).

| Comportamento (behavior), com o nome que o firmware informa | O que é desenhado |
|---|---|
| `Key Press` | Sem mudança: o rótulo da tecla. As teclas de mídia (volume, mudo, brilho, play/pause) são desenhadas como ícones |
| `Momentary Layer`, `Toggle Layer`, `To Layer`, `Sticky Layer` | Um ícone e o nome da camada |
| `Layer-Tap` | O ícone de camada, o nome da camada e a tecla de toque |
| `Mod-Tap` | A tecla de toque e, depois, o modificador de segurar |
| `Sticky Key`, `Key Toggle` | Um ícone e a tecla |
| `Key Repeat` | Um ícone |
| `Bluetooth` | O ícone de Bluetooth com o número do perfil (selecionar, desconectar), ou a ação (limpar, limpar todos, próximo, anterior) |
| `Output Selection` | USB, Bluetooth, alternar ou nenhuma saída |
| `Underglow`, `Backlight` e comportamentos de iluminação que informam os mesmos comandos | Um ícone e uma palavra curta por comando: `on/off`, `hue`, `sat`, `bri`, `speed`, `time`, `effect`, `reset`, `color`, com um sinal de mais ou de menos para subir e descer |
| Comportamentos chamados `fx_*` (um por efeito de iluminação) | O cabeçalho `Effect`, um ícone escolhido pelo nome do efeito e o próprio nome |
| Comportamentos chamados `ug_*` (um por animação do underglow, por exemplo `ug_rain`) | O cabeçalho `Underglow`, um ícone escolhido pela animação e o nome dela (`rainbow`, `breathe`, `spectrum`, `starlight`, `off`) |
| `Steno On`, `Steno Off` (os macros do corne-zmk que vão para a camada de estenotipia e voltam) | Um ícone de teclado (riscado no desligar) e o texto `steno on` ou `steno off` |
| `Steno` (o comportamento das teclas GeminiPR do módulo do corne-zmk; o parâmetro é a tecla de estenotipia) | Só o nome da tecla de estenotipia (`S1-`, `T-`, `*1`, `A-`, `-E`, `#`, ...), tirado dos nomes de parâmetro que o firmware informa |
| `Studio Unlock`, `Caps Word`, `Reset`, `Bootloader`, `External Power`, `Mouse Key Press`, `Grave/Escape` | Um ícone ou um texto curto |
| `Transparent`, `None` | Um ícone esmaecido |
| Qualquer outro | Um rótulo montado a partir das descrições de parâmetros que o firmware informa: uso HID, nome da camada, número ou nome da constante |

Tudo é derivado do que o firmware informa (o nome de exibição do comportamento e as
descrições dos parâmetros); por isso, um comportamento que este fork não conhece ainda
recebe um rótulo genérico. As regras ficam em
[`src/keyboard/bindingDisplay.tsx`](src/keyboard/bindingDisplay.tsx);
[`src/keyboard/BindingLabel.tsx`](src/keyboard/BindingLabel.tsx) desenha o resultado.

Outras mudanças:

- As seis teclas de mídia que o upstream rotula com emoji (brilho, play/pause, mudo, volume) são
  desenhadas como ícones, e os emoji foram removidos de `src/hid-usage-name-overrides.json`.
- O rodapé, os títulos das páginas, a página de download e o `NOTICE` informam que este é
  um fork não oficial. A página de download aponta para os apps oficiais, que não incluem
  estas mudanças.
- O app pode ser servido a partir de um subdiretório (`VITE_BASE_PATH`), e o workflow
  [`.github/workflows/pages.yml`](.github/workflows/pages.yml) o publica no GitHub Pages.
- Stories do Storybook com o keymap de um Corne, uma por camada (`Keyboard/Keymap (Corne)`).
- A confirmação de **Restore Stock Settings** lista o que ela devolve: o keymap e, quando o
  firmware os tem, as cores das luzes e as configurações das telas.
- Na visão Keys, uma tecla pode ser arrastada para outra camada (abaixo), e cada tecla pode
  mostrar o que imprime com Shift pressionado, entre parênteses ao lado do rótulo (abaixo).

O que não muda: a edição do keymap e o que o app lê do teclado ou grava nele para isso.
Os ícones e a legenda do Shift afetam apenas como as teclas são desenhadas, e a hospedagem
apenas como o app é servido; arrastar teclas (abaixo), inclusive de uma camada para outra,
grava com a mesma requisição do seletor de binding; as abas Lights e
Display (mais abaixo) acrescentam requisições próprias, e a aba OLED usa as da aba
Display. A aba Diagnostics, e os valores ao vivo da aba OLED, só leem, com duas
requisições próprias; a aba Files grava com requisições que as outras abas já usam. As
abas só são usadas quando o firmware tem o que elas editam ou leem.

## Mover teclas arrastando (a visão Keys)

Na visão **Keys**, pressione uma tecla e arraste-a sobre outra tecla, da mesma camada ou de
outra:

- **Solte** sobre outra tecla e as duas teclas **trocam** de binding (comportamento e
  parâmetros). Segure **Ctrl** ou **Alt**, antes ou durante o arraste, e o drop
  **copia**: a tecla sobre a qual você soltou recebe o binding da tecla arrastada, e a
  tecla arrastada continua como estava.
- **Para outra camada.** Durante o arraste, leve o ponteiro até uma camada da lista à
  esquerda do teclado e mantenha-o ali por um instante (350 ms, `LAYER_HOVER_MS`): essa
  camada abre, o arraste continua sobre as teclas dela, e o drop funciona em qualquer uma
  delas (inclusive a tecla na mesma posição da arrastada), trocando ou copiando entre as
  duas camadas. A camada sob o ponteiro é marcada com um anel, e a etiqueta da cópia que
  segue o ponteiro mostra `Hold to open this layer` enquanto ele espera. Com a camada
  aberta, a etiqueta diz de onde a tecla vem: `Swap with QWERTY` ou `Copy from QWERTY`.
  Passar pela lista sem parar não abre nada.
- Durante o arraste, a tecla pressionada fica esmaecida com um contorno tracejado, uma
  cópia menor dela segue o ponteiro com uma etiqueta (`Swap` ou `Copy`) e a tecla sob o
  ponteiro é destacada. A etiqueta mostra `drop on a key` enquanto o ponteiro não está
  sobre nenhuma tecla. A cópia continua mostrando a tecla que você pegou quando outra
  camada abre.
- **Esc** cancela o arraste. Soltar o ponteiro em qualquer lugar que não seja uma tecla
  não faz nada, e perder o ponteiro ou sair da janela também não. Se o arraste tinha aberto
  outra camada, a camada de onde a tecla foi pega volta para a tela, e nada é gravado.
- O arraste começa depois que o ponteiro se move 6 pixels; por isso um clique simples
  continua selecionando a tecla. Depois de um drop, a tecla sobre a qual você soltou fica
  selecionada, o que mostra o binding dela no seletor logo abaixo.
- Um drop é **um passo** de Undo e de Redo, mesmo numa troca, que altera duas teclas, e
  mesmo quando as duas teclas estão em camadas diferentes (o Undo devolve as duas). Ele
  é gravado no teclado com a requisição `setLayerBinding`, a mesma que o seletor de binding
  usa (cada gravação diz para qual camada é); por isso **Save** e **Discard** funcionam
  como antes. Se o teclado recusar uma gravação, as teclas já gravadas voltam ao que eram e
  o app mostra um alerta.
- Teclas giradas (as teclas do polegar do Corne) e as teclas da metade direita funcionam
  como qualquer outra. Mouse, caneta e toque usam os mesmos eventos de ponteiro.

As regras (o que um drop faz, também entre duas camadas, como um arraste começa, termina e
é cancelado, qual camada abre e quando a primeira volta) são funções puras em
[`src/keyboard/keyDrag.ts`](src/keyboard/keyDrag.ts), cobertas por
[`src/keyboard/keyDrag.test.ts`](src/keyboard/keyDrag.test.ts).
[`src/keyboard/useKeyDrag.ts`](src/keyboard/useKeyDrag.ts) escuta o ponteiro e acha a camada
sob ele, [`src/keyboard/LayerPicker.tsx`](src/keyboard/LayerPicker.tsx) marca essa camada,
[`src/keyboard/KeyDragGhost.tsx`](src/keyboard/KeyDragGhost.tsx) desenha o que segue o
ponteiro, e o temporizador que abre a camada e a edição em si (`doDropKey`, `writeEdits`)
estão em [`src/keyboard/Keyboard.tsx`](src/keyboard/Keyboard.tsx).

**Uma mudança no seletor de binding.** O
[`src/behaviors/BehaviorBindingPicker.tsx`](src/behaviors/BehaviorBindingPicker.tsx) do
upstream avisava o teclado de uma mudança a partir de um efeito que comparava a sua própria
cópia do binding com o binding que recebia. Quando um binding mudava por fora do seletor,
como acontece num drop sobre a tecla selecionada (e também no undo e no redo), essa
comparação podia rodar com o valor antigo e gravá-lo de volta, e o valor antigo e o novo
podiam então se substituir sem parar. Isso foi visto no teclado de demonstração depois de
copiar uma tecla sobre outra com Ctrl pressionado, e deixou de acontecer com esta mudança.
Neste fork o seletor só avisa o teclado quando o usuário muda algo nos seus próprios
controles.

## O que as teclas imprimem com Shift pressionado (a visão Keys)

Uma tecla pode mostrar, entre parênteses depois do rótulo, o que ela imprime com Shift
pressionado: o `1` da fileira de números é desenhado como `1 (!)`. O menu no canto
superior direito do teclado, ao lado do zoom, escolhe para qual layout de teclado é a
legenda, e o navegador lembra da escolha:

| Escolha | O que as teclas mostram |
|---|---|
| **Shift: US** (o padrão) | O que um layout US imprime com Shift: `1 (!)`, `2 (@)`, e o mesmo para o resto da fileira de números, os sinais e os colchetes |
| **Shift: ABNT2** | O que o layout brasileiro ABNT2 imprime. O rótulo de uma tecla que imprime outra coisa nesse layout também muda: a tecla do `;` US é desenhada como `Ç`, a do `[` US como `´ (`)` e a do `'` US como `~ (^)` |
| **Shift: off** | Apenas o rótulo de cada tecla, como antes |

- As letras não têm legenda: já são desenhadas como maiúsculas.
- Uma tecla que envia Shift no próprio código (`LS(N1)`, que digita `!`) é desenhada como o
  que ela imprime, `!`, sem parênteses. Os outros modificadores implícitos (Ctrl, Alt, GUI)
  mudam o que a tecla faz, não o que ela imprime: não acrescentam legenda.
- A legenda é desenhada para toda tecla do teclado que o app desenha como rótulo: um key
  press, a tecla de toque de um Mod-Tap ou de um Layer-Tap, e a tecla de um sticky key ou
  de um key toggle. Camadas, Bluetooth, luzes, teclas de mídia e os demais comportamentos
  são desenhados como antes.
- É apenas um desenho. O teclado envia o mesmo código de tecla com qualquer layout: o
  caractere é escolhido pelo layout do computador, e o menu diz para qual deles é a
  legenda. As tabelas dos dois layouts (por HID usage) estão em
  [`src/keyboard/shiftLegend.ts`](src/keyboard/shiftLegend.ts), cobertas por
  [`src/keyboard/shiftLegend.test.ts`](src/keyboard/shiftLegend.test.ts);
  [`src/keyboard/HidUsageLabel.tsx`](src/keyboard/HidUsageLabel.tsx) desenha o rótulo com a
  legenda, e [`src/keyboard/ShiftLayoutContext.ts`](src/keyboard/ShiftLayoutContext.ts)
  leva a escolha até ele.

## Cores das luzes (a aba Lights)

Com um firmware que tem mapas de luzes editáveis, o cabeçalho ganha uma segunda visão,
**Lights**, ao lado de **Keys** (o editor de teclas). Ela desenha o teclado e permite pintar a cor de cada
LED (o que fica sob cada tecla e o underglow) de cada camada:

- Escolha uma camada, escolha uma cor (uma das 14 cores da paleta de `led_colors.dtsi`, o
  seletor de cor do sistema ou um valor hexadecimal) e arraste sobre os LEDs. O teclado
  mostra as cores quando você solta.
- Preencha todos os LEDs, somente as teclas ou somente o underglow, e devolva uma camada
  às cores com que o firmware foi compilado.
- **Save** e **Discard** no cabeçalho agem sobre as teclas e sobre as luzes juntas, e
  **Undo** e **Redo** cobrem as duas. **Restore Stock Settings** também devolve as cores
  de fábrica.
- **Export led_colors.dtsi** baixa as cores como o `config/led_colors.dtsi` do
  [corne-zmk](https://github.com/lenerdz/corne-zmk), para compilá-las no firmware como os
  novos padrões.

Ela precisa do módulo [zmk-rgb-matrix](https://github.com/lenerdz/zmk-rgb-matrix) de
lenerdz (branch `corne-fixes`) e do protocolo do
[zmk-studio-messages](https://github.com/lenerdz/zmk-studio-messages), que acrescentam seis
requisições e uma notificação ao subsistema keymap do ZMK Studio. Com qualquer outro
firmware a visão Lights não é oferecida (o teclado responde "RPC not found" à primeira
requisição) e o app funciona como antes. O app conversa com o teclado por uma cópia do
cliente TypeScript incluída no repositório (vendored) que traz essas mensagens
([`src/vendor/zmk-studio-ts-client`](src/vendor/zmk-studio-ts-client/README.md)).

Para experimentar sem um teclado, use o **Demo keyboard** (veja
[Desenvolvimento](#desenvolvimento)). Como funciona, o protocolo e os arquivos:
[`src/lights/README.md`](src/lights/README.md).

## Configurações das telas (a aba Display)

Com um firmware que tem configurações de tela, o cabeçalho ganha uma terceira visão,
**Display**, ao lado de **Keys** e **Lights** (cada uma só quando o firmware tem o que ela
edita). Ela define o que as telas OLED e as luzes do teclado fazem enquanto ninguém digita:

- O **contraste** da tela esquerda e da tela direita, com um controle deslizante (slider)
  para cada uma.
- **Quando as telas apagam**, **quando as luzes das teclas apagam** (os LEDs sob as teclas)
  e **quando o underglow apaga** (os outros LEDs): cada um nunca, só na bateria (enquanto o
  USB não está conectado àquela metade) ou sempre, e depois de quanto tempo sem atividade
  (de 10 segundos a uma hora), um tempo próprio para cada um dos três. O tempo conta a
  partir da última tecla pressionada em qualquer metade, e as duas metades apagam e voltam
  juntas. O firmware do corne-zmk é compilado com as telas nunca apagando, e com as luzes
  das teclas e o underglow apagando só na bateria, depois de 5 minutos.
- A **proteção contra burn-in** das telas: o **deslocamento de pixel** (de tempos em
  tempos tudo o que as telas mostram se move um pixel ao longo de um caminho pequeno; dá
  para desligá-lo e definir de quanto em quanto tempo ele se move e a que distância, de 1 a
  4 pixels) e o **escurecimento** (depois de um tempo sem atividade as telas baixam o
  contraste, antes de apagar; define-se depois de quanto tempo, ou nunca, e para qual
  porcentagem do contraste normal).
- O **toast das luzes**: se a tela direita mostra um aviso quando as luzes mudam (efeito,
  brilho, ligar e desligar) e por quanto tempo.
- **Restore defaults** devolve todas as configurações ao que o firmware tinha ao ser
  compilado.

Tudo é aplicado pelo teclado na hora e guardado por ele alguns segundos depois da última
mudança; por isso não há nada para salvar: **Save** e **Discard** não agem sobre essas
configurações. **Undo** e **Redo** agem, enquanto esta aba ou a aba OLED está aberta: os
botões do cabeçalho, e Ctrl+Z e Ctrl+Y (Ctrl+Shift+Z também), desfazem e refazem o que
você mudou nas duas abas, que compartilham um único histórico de até 100 passos. Arrastar
um controle deslizante é um passo, um widget arrastado por qualquer caminho (ou movido com
as setas) também, e **Restore defaults** também. O histórico começa vazio a cada vez que o
app se conecta ou lê o teclado de novo (depois de **Discard** ou de **Restore Stock
Settings**) e é esquecido quando o teclado recusa uma mudança e o app lê as configurações
de novo. Com qualquer outra aba aberta, Undo e Redo são os das teclas e das luzes, como
antes. **Restore Stock Settings** também devolve as configurações aos
padrões. O que cada tela mostra, e onde, é definido na aba OLED (abaixo) quando o firmware
tem o layout das telas OLED; o idioma do toast e o que a aba OLED não cobre continuam sendo
escolhidos quando o firmware é compilado.

Ela precisa do módulo [zmk-rgb-matrix](https://github.com/lenerdz/zmk-rgb-matrix) de
lenerdz (branch `corne-fixes`, compilado com `CONFIG_KEYPAW_DISPLAY_SETTINGS=y`), do fork
[zmk-nice-oled](https://github.com/lenerdz/zmk-nice-oled) (que lê as configurações do
toast e desenha o deslocamento de pixel) e do protocolo do
[zmk-studio-messages](https://github.com/lenerdz/zmk-studio-messages), que acrescenta
três requisições (`get_display_info`, `set_display_setting` e
`restore_display_defaults`) ao subsistema keymap do ZMK Studio. Com qualquer outro
firmware a visão Display não é oferecida (o teclado responde "RPC not found" à primeira
requisição) e o app funciona como antes.

As configurações, as faixas de valores, como as mudanças trafegam e os arquivos:
[`src/display/README.md`](src/display/README.md).

## Layout das telas (a aba OLED)

Com um firmware que tem o layout das telas OLED, o cabeçalho ganha uma quarta visão,
**OLED**, ao lado de **Keys**, **Lights** e **Display** (cada uma só quando o firmware tem
o que ela edita). Ela desenha as duas telas OLED do teclado na vertical, com a faixa que o
painel realmente mostra acesa, e define o que cada tela mostra e onde. Cada tela também tem
uma prévia da faixa em pé, do jeito que ela é lida no teclado (o painel é montado de lado,
então nunca fica na horizontal), com um botão que gira a visão um quarto de volta: ele gira
só a visão, nada é enviado ao teclado.

- **Arraste um widget** (a bateria, o link Bluetooth, o nome da camada, a velocidade de
  digitação, a animação, ...) para movê-lo. As setas movem o selecionado um pixel, ou oito
  com Shift. O inspetor mostra o tamanho de cada widget, onde ele está e quanto dele o
  painel mostra.
- **Esconda um widget** com Delete ou com a chave dele, e **mostre-o de novo** clicando nele
  na bandeja dos widgets escondidos ou arrastando-o para a tela.
- **Escolha a imagem da tela direita** em uma galeria de 42 imagens, em dois grupos: 36
  animações (Gem, Cat, Head, Spaceman, Pokemon e mais 31: Equalizer, Radar, Heartbeat,
  Digital rain, Wire cube, Atom, Helix, Warp, Sonar, Bouncing ball, Flame, Waterfall, Lava
  lamp, Storm, Snowfall, Jellyfish, Falling blocks, Pong, Invaders, Chomper, Game of Life,
  Plasma, Spiral, Newton's cradle, Gears, Hourglass, Windmill, Fireworks, Flying saucer,
  Eye, Key wave) e 6 imagens fixas (Mountains, Skyline, Circuit, Keyboard, Moon cat e
  Planet), cada uma tocando no seu cartão, com o tamanho e o tempo de um ciclo. As outras
  imagens fixas (o logo do Vim, VIPs Marcos e 22 das novas) foram tiradas do firmware.
  Clique em uma, ou arraste-a para a tela direita, e ajuste o tempo de um ciclo.
- **Gire a imagem** um quarto de volta para qualquer lado, **corte-a** em um pedaço que se
  seleciona com uma moldura (arraste-a, redimensione-a ou digite os números dela) e escolha
  **como os widgets se misturam com ela**: mostrados em reverso onde estão sobre uma parte
  acesa da imagem, para continuarem legíveis (o padrão), ou somados a ela. O firmware
  desenha a imagem por cima dos widgets, então qualquer widget, inclusive a bateria da
  metade direita, pode ser movido para cima dela.
- **Acompanhe as telas com valores ao vivo.** Ligue **Live values** e os desenhos seguem o
  que o teclado diz agora (a bateria de cada metade, o link com a metade esquerda, a saída
  e o perfil Bluetooth, a camada, a velocidade de digitação) em vez de serem amostras; veja
  [O que o teclado está fazendo](#o-que-o-teclado-está-fazendo-live-values-e-a-aba-diagnostics).
- **Veja o que as telas podem mostrar**, com o tamanho de cada coisa, e quais escolhas só
  um novo build do firmware acrescenta (o cachorro Luna, o gato Bongo, os indicadores de
  modificadores, o Raw HID, ...), cada uma com a opção a ligar.

Tudo é aplicado pelo teclado na hora e guardado por ele alguns segundos depois da última
mudança; por isso não há nada para salvar: **Save** e **Discard** não agem sobre o layout.
**Undo** e **Redo** (o cabeçalho, Ctrl+Z e Ctrl+Y) desfazem e refazem o que você mudou aqui
e na aba Display enquanto uma das duas está aberta (veja a aba Display, acima). **Restore
Stock Settings**, e **Restore defaults** da aba Display, devolvem o layout ao que o
firmware tinha ao ser compilado. Sem Live values, os desenhos são amostras (uma bateria de
85%, a camada `QWERTY`, uma velocidade de digitação de 42), não o estado ao vivo das telas.

Ela precisa do que a aba Display precisa, com `CONFIG_KEYPAW_OLED_LAYOUT=y` no build das
duas metades, e do fork [zmk-nice-oled](https://github.com/lenerdz/zmk-nice-oled) de
lenerdz, que lê o layout enquanto o teclado funciona. Ela não tem requisições próprias: o
layout é feito de configurações de tela (ids de 16 em diante), lidas e gravadas com as três
requisições da aba Display. Com qualquer outro firmware a visão OLED não é oferecida e o
app funciona como antes.

Como a geometria funciona (o canvas de 68 x 160 pixels, a faixa de 32 x 128 que o painel
mostra, a posição da imagem), os ids, os arquivos e como os sprites são gerados:
[`src/oled/README.md`](src/oled/README.md).

## O que o teclado está fazendo (Live values e a aba Diagnostics)

Com um firmware que responde a duas requisições somente de leitura, o app pode perguntar à
metade esquerda (a que está conectada a ele) o que ela está fazendo e que firmware ela
executa. Duas coisas as usam:

- **Live values**, uma chave na aba OLED. Ligada, os desenhos das telas seguem o teclado em
  vez de serem amostras: a bateria de cada metade (a da direita é o que a metade esquerda
  sabe dela, e aparece escrita como `--%` enquanto não há leitura), o link com a metade
  esquerda, a saída (o ícone de USB enquanto as teclas vão para o USB; senão, o estado do
  perfil Bluetooth selecionado: conectado, pareado sem sinal ou não pareado), as marcas e o
  número do perfil, o nome da camada e a velocidade de digitação (o ponteiro, o número e o
  gráfico, ao qual o app acrescenta uma leitura por segundo). O toast das luzes não tem o
  que ler e continua sendo uma amostra.
- **Diagnostics**, a sexta visão, depois de **Files**. Tem três grupos: o **firmware**
  (teclado, placa, Zephyr e o build: branch, commit, número da execução do CI e dia), a
  **memória da metade esquerda** (a flash e a RAM, uma barra cada, com os bytes usados, os
  bytes livres e uma palavra: sobra bastante, ficando apertada quando menos de 15% está
  livre, quase cheia quando menos de 3% está) e **agora** (as baterias das duas metades, se
  a metade direita está conectada, a camada, a velocidade de digitação, para onde vão as
  teclas e há quanto tempo o teclado está ligado). **Copy the report** coloca tudo isso na
  área de transferência como texto simples, para colar em uma mensagem ou em uma issue. A
  aba só lê: nada nela altera o teclado.

Os números são os da metade **esquerda**. A metade direita executa um firmware próprio, que
o ZMK Studio não consegue consultar; por isso, pelo app, só a bateria e a conexão dela são
conhecidas. A flash e a RAM são os números que o build imprime (`FLASH` e `RAM`), lidos pelo
firmware dos símbolos do linker, então podem ser comparados com o log do CI.

**Como ele pergunta.** O teclado não tem notificação para isso; por isso o app pergunta,
uma requisição de cada vez (a próxima meio segundo, ou um segundo na aba Diagnostics, depois
da resposta à anterior). Ele só pergunta enquanto a aba que precisa disso está aberta, o
teclado está conectado e desbloqueado, e **a página está sendo exibida**: uma aba escondida
do navegador não pergunta nada. Depois de três falhas seguidas ele para e avisa; com Live
values, desligar e ligar a chave tenta de novo. Cada requisição reinicia o temporizador de
inatividade do bloqueio do ZMK Studio (um firmware com `CONFIG_ZMK_STUDIO_LOCKING`); por
isso, **enquanto Live values está ligado, ou a aba Diagnostics está aberta, o teclado não se
bloqueia sozinho**.

Ele precisa do módulo [zmk-rgb-matrix](https://github.com/lenerdz/zmk-rgb-matrix) de
lenerdz (branch `corne-fixes`) com `CONFIG_KEYPAW_DEVICE_STATUS_STUDIO` (ligada por padrão
com o RPC do ZMK Studio, então na metade central) e do protocolo do
[zmk-studio-messages](https://github.com/lenerdz/zmk-studio-messages), que acrescenta as
requisições `get_live_status` (109) e `get_firmware_info` (110) ao subsistema keymap. Com
qualquer outro firmware a aba Diagnostics não é oferecida (o teclado responde "RPC not
found" à primeira requisição) e Live values avisa que o firmware não consegue informar o
estado dele, deixando os desenhos como amostras. O teclado de demonstração responde às
duas (os números dele são os da metade esquerda do build do corne-zmk); **Demo keyboard (no
live status)** não responde.

Como funciona, os arquivos e os testes: [`src/live/README.md`](src/live/README.md) e
[`src/diagnostics/README.md`](src/diagnostics/README.md).

## Tudo em um arquivo (a aba Files)

A visão **Files**, oferecida enquanto o teclado está desbloqueado, coloca o que o app edita
em um único arquivo de texto e aplica esse arquivo de novo aqui ou em outro teclado:

- **Save to a file** grava um arquivo JSON (`corne-backup-2026-10-25-1530.json`: o nome que o
  teclado deu a si mesmo, o dia e a hora em UTC) com as partes marcadas: as **teclas**
  (cada camada: o nome dela e, para cada tecla, o nome do comportamento e os dois
  parâmetros), as **luzes** (as cores do mapa de cada camada, como `#rrggbb`) e as **telas**
  (cada configuração de tela, o layout das telas OLED incluído, cada uma com o id e o
  nome). Ele tem o que o app mostra agora, **com as mudanças que ainda não foram salvas no
  teclado**. É texto simples, com uma tecla ou uma lista de cores por linha, para poder ser
  lido, comparado com outro e guardado em um repositório (o teclado de demonstração inteiro
  tem cerca de 33 KB e 670 linhas).
- **Open a file** lê um arquivo desses e mostra um **plano** antes de gravar qualquer
  coisa: para cada parte, o que mudaria (quantas teclas e em quais camadas, quais camadas
  são renomeadas, quantas cores em quais mapas, quais configurações, de que valor para que
  valor) e o que não pode ser aplicado e por quê. Uma parte que já é igual à do teclado diz
  isso e fica desmarcada. Nada é gravado até **Apply the checked parts**.
- **Como um arquivo é casado com o teclado.** As teclas pela **posição da camada** no keymap
  e pela posição da tecla, com o comportamento encontrado pelo nome (uma tecla cujo
  comportamento o teclado não tem, e uma camada com outro número de teclas, ficam como
  estão e são informadas; um nome de camada longo demais é cortado); as cores pelo **id da
  camada**, e só quando o arquivo tem o mesmo número de cores por mapa (54 no Corne), então
  um arquivo feito para outro layout de LEDs não aplica nenhuma cor; as telas pelo **id da
  configuração**, e um valor fora da faixa que o teclado informou é mantido no extremo mais
  próximo dela, e o plano diz isso, e uma imagem que foi tirada do firmware (uma das imagens
  fixas aposentadas) é deixada de fora, com o teclado mantendo a que tem, e o plano diz
  isso também.
- **Um arquivo que é recusado.** Um que não é JSON válido, não é um backup deste app, tem uma
  parte que o app não consegue usar (a mensagem diz qual) ou vem de uma versão mais nova do
  app (um número de formato maior) é recusado, e um arquivo nunca é aplicado pela metade: as
  teclas são gravadas todas ou nenhuma (se o teclado recusa uma, as que já foram gravadas
  são devolvidas).
- **Um arquivo de outro teclado.** Se o nome no arquivo não é o nome que o teclado tem agora,
  a aba avisa que o arquivo pode falhar ou parecer errado aqui e manda conferir o plano.
- **Undo e Save.** As teclas de um arquivo são **um passo**, e as cores de cada camada são
  um passo, do Undo e Redo do cabeçalho (Ctrl+Z e Ctrl+Y), como qualquer mudança nas abas
  Keys ou Lights. Elas precisam de **Save** no cabeçalho para serem guardadas pelo teclado:
  depois de aplicá-las, a aba avisa e tem um botão que faz o mesmo que o Save. As telas são
  um passo do histórico das abas Display e OLED, que é onde desfazê-las, e o teclado as
  guarda sozinho.

Ela usa apenas requisições que as outras abas usam (o keymap, os mapas de luzes e as
configurações de tela); por isso não precisa de nada do firmware além delas: uma parte que o
teclado não tem (as luzes ou as telas) aparece como indisponível, com o motivo, e fica fora
do arquivo. O formato, o plano e os arquivos: [`src/backup/README.md`](src/backup/README.md).

## Situação

Os ícones foram verificados com as stories do Storybook, cujos dados de exemplo
([`src/keyboard/corne.mock.ts`](src/keyboard/corne.mock.ts)) seguem o código-fonte do ZMK
e do [zmk-rgb-matrix](https://github.com/lenerdz/zmk-rgb-matrix), e usados com um Corne
real conectado por USB: os ícones e os rótulos funcionaram (relato do dono do teclado).
Se uma tecla mostrar um rótulo errado ou vazio, o nome do comportamento exibido na dica
(tooltip) dela é o que as regras de `src/keyboard/bindingDisplay.tsx` precisam tratar.

A aba Lights foi testada em um navegador com o teclado de demonstração, pela mesma
moldura (framing) e codificação de mensagens usadas com um teclado real, e é coberta por
`npm test`. Em um Corne real conectado por USB ela funcionou (relato do dono do teclado,
sem detalhar cada operação: pintar, Save, Discard, restaurar, a cópia para a metade
direita), então nenhuma dessas operações tem confirmação individual.

A aba Display foi testada em um navegador com o teclado de demonstração, pela mesma
moldura (framing) e codificação de mensagens usadas com um teclado real: leitura das
configurações, arrastar um controle deslizante (72 mudanças viraram 13 requisições, a
última com o valor final), os controles que esperam por outro (o tempo para apagar, a
duração do toast), as três formas de apagar a tela, **Restore defaults** e **Restore
Stock Settings** com a aba aberta; o teclado de demonstração sem configurações de tela
não tem a aba Display. Os sete grupos que existem agora (as luzes das teclas, o underglow,
o deslocamento de pixel e o escurecimento vieram depois dos primeiros) foram desenhados na
ordem, com os valores do teclado de demonstração, e escolher **Never** para as luzes das
teclas desabilitou o controle deslizante do tempo delas, com o motivo, e **Always** o
habilitou de novo. Ela é coberta por `npm test`. **Não foi testada em um teclado real**;
portanto, se os LEDs apagam depois do tempo definido e voltam com uma tecla de qualquer
metade, se o deslocamento de pixel move as telas e se o escurecimento baixa o contraste
delas não está confirmado: a base são os testes do módulo e do zmk-nice-oled em um
computador e a compilação do firmware no CI do corne-zmk.

A aba OLED foi testada em um navegador com o teclado de demonstração, pela mesma moldura
(framing) e codificação de mensagens usadas com um teclado real: as duas telas, arrastar
cada widget com o ponteiro, as setas, esconder com Delete, mostrar pela bandeja com clique
e com arraste, escolher uma imagem na galeria com clique e com arraste, o inspetor,
devolver uma tela ao que o build tinha e os níveis de zoom; também girar a imagem, a
moldura do corte (movê-la, digitar os números dela, voltar à imagem inteira), a bateria da
metade direita arrastada para cima da imagem em reverso e o botão que gira a visão de uma
tela; o teclado de demonstração sem configurações de tela não tem a aba OLED. Ela é coberta
por `npm test`. A primeira versão da aba (mover, mostrar e esconder os widgets, e as sete
imagens do zmk-nice-oled) foi usada no Corne do dono do teclado, que relatou que
funcionou, sem detalhar cada operação, então nenhuma delas tem confirmação individual. A
segunda (girar, cortar e misturar a imagem, o reverso onde um widget está sobre ela, a
prévia em pé e as 19 imagens que vieram com ela) também foi usada no mesmo teclado: o dono
relatou que funcionou perfeitamente e que gostou das animações e das imagens fixas, de novo
sem detalhar cada operação. O que foi acrescentado depois disso, as 20 animações do segundo
lote (tipos 26 a 45) e a retirada de 24 imagens fixas (os tipos que foram aposentados, de
modo que a galeria tem 42 imagens), **não foi testado em um teclado real**: como as imagens
ficam na tela se baseia no código do firmware, nos testes dele em um computador e nos
sprites que o app desenha a partir das mesmas imagens, não na tela. No navegador a galeria
mostrou 42 imagens, as seis imagens fixas (Mountains, Skyline, Circuit, Keyboard, Moon cat
e Planet) e nenhuma das aposentadas. O toque não foi testado em nenhum dispositivo.

Os valores ao vivo, a aba Diagnostics, a aba Files e o Undo e o Redo das abas Display e OLED
foram testados com o teclado de demonstração, pela mesma moldura (framing) e codificação de
mensagens usadas com um teclado real, em dois navegadores: o embutido em um editor e um
Microsoft Edge sem janela (headless) conduzido pelo protocolo DevTools (os valores ao vivo
precisaram do segundo: o primeiro informa que a página dele está escondida, e nesse caso,
como projetado, nada é perguntado). **Live values** desenhou a camada, a velocidade (o
ponteiro, o número e o gráfico), as baterias, a saída e o perfil a partir do teclado, e eles
mudaram conforme os valores dele mudavam (a camada de `FN1` para `RAISE`, a velocidade de 60
para 21 palavras por minuto); a aba Diagnostics mostrou o firmware, as duas barras de memória
e o estado do teclado; o teclado de demonstração sem estado ao vivo não tem a aba
Diagnostics, e Live values avisa que o firmware não consegue informar o estado dele. A aba
**Files** gravou um backup (um download de verdade, de 33.466 bytes), leu-o de volta e disse
que era igual ao teclado nas três partes, aplicou uma cópia editada (duas teclas trocadas e
uma camada renomeada, duas cores, duas configurações, uma delas mantida no valor mais
próximo) e mostrou o botão de Save das teclas; a aba Keys mostrou as teclas novas na hora, e
Ctrl+Z e Ctrl+Y no cabeçalho desfizeram e refizeram as cores e depois as teclas. Na aba
Display, Ctrl+Z e Ctrl+Y desfizeram e refizeram um controle deslizante e depois as telas do
arquivo. Tudo isso é coberto por `npm test` (o plano, a gravação com a reversão, o formato,
o histórico, o poller, o desenho a partir dos valores ao vivo). **Nada disso foi testado em
um teclado real**: os números que o firmware informa (a flash e a RAM, que vêm de símbolos
do linker que o firmware não usava antes, o estado do perfil Bluetooth, a bateria da metade
direita), o que cada widget ao vivo desenha a partir deles e o teclado guardar as telas que
um arquivo define não estão confirmados.

As teclas `Steno On` e `Steno Off` e a camada STENO foram conferidas em um navegador com o
teclado de demonstração e na story `Keyboard/Keymap (Corne)` do Storybook, não em um
teclado real.

A camada GEMINI, as teclas `Steno` dela e as teclas de animação do underglow (`ug_*`) foram
conferidas em um navegador com o teclado de demonstração: a aba Keys desenha as 42 teclas da
camada GEMINI e, na camada SYS, as cinco teclas de underglow e a tecla que vai para a
GEMINI; a aba Lights lista as oito camadas e mostra as cores da GEMINI. O código de
exportação, executado com os dados de demonstração, gera os mesmos símbolos na mesma ordem
que o `config/led_colors.dtsi` do corne-zmk. Nada disso foi testado em um teclado real.

O arraste de teclas foi testado em um navegador com o teclado de demonstração: troca,
cópia com Ctrl e com Alt, alternância entre elas durante o arraste, Esc, soltar fora das
teclas, as teclas giradas do polegar, uma camada que não a primeira, Undo e Redo, e a
edição de uma tecla pelo seletor depois. O arraste **para outra camada** também foi testado
ali, com os eventos de ponteiro que um mouse envia: manter a tecla sobre uma camada da
lista a abriu depois do atraso (passar sem parar não abriu nada), uma troca e uma cópia
sobre uma tecla da outra camada (inclusive a da mesma posição) gravaram as duas camadas,
um passo de Undo as devolveu, e Esc, e soltar o botão fora das teclas, trouxeram a primeira
camada de volta sem gravar nada. As regras são cobertas por `npm test`. Ele **não foi
testado em um teclado real**, e o toque não foi testado em nenhum dispositivo.

A legenda do Shift foi testada em um navegador com o teclado de demonstração, com as três
escolhas: `1 (!)` e o resto da fileira de números com **US**, as teclas que imprimem outra
coisa com **ABNT2** (o rótulo das teclas do `;`, do `[` e do `'` US mudou) e os rótulos
como antes com **off**; a escolha foi mantida quando a página foi carregada de novo. As
tabelas dos dois layouts foram escritas a partir dos layouts e dos nomes das HID usages, e
**não foram comparadas com um teclado físico**, nem testadas em um real.

## Como usar

1. Abra a página em um navegador com suporte a WebSerial (Chrome, Edge ou outro
   navegador baseado em Chromium). Firefox e Safari não têm.
2. O firmware do teclado precisa ter o ZMK Studio habilitado; veja a
   [documentação do ZMK Studio](https://zmk.dev/docs/features/studio).
3. Conecte o teclado por USB (em um teclado dividido, a metade que executa o Studio, a
   central), escolha **USB** e desbloqueie com a tecla associada a `&studio_unlock`.
4. Em **Keys**, clique em uma tecla para editá-la, ou arraste-a sobre outra tecla para
   trocar as duas (segure Ctrl ou Alt para copiar). Para soltá-la em outra camada, mantenha-a
   sobre essa camada na lista por um instante: a camada abre. O menu no canto superior
   direito escolhe se as teclas mostram o que imprimem com Shift pressionado (US, ABNT2 ou
   off).
5. Se o firmware tiver mapas de luzes editáveis, escolha **Lights** no cabeçalho para
   editar as cores.
6. Se o firmware tiver configurações de tela, escolha **Display** para ajustar as telas,
   quando as telas, as luzes das teclas e o underglow apagam, e a proteção contra burn-in.
7. Se o firmware tiver o layout das telas OLED, escolha **OLED** para mover os widgets das
   duas telas e escolher a animação da tela direita; ligue **Live values** para vê-los com o
   que o teclado diz agora.
8. Escolha **Files** para salvar as teclas, as cores e as telas em um único arquivo, ou
   para aplicar um.
9. Se o firmware informar o estado dele, escolha **Diagnostics** para ver o firmware, a
   flash e a RAM que sobram e o que o teclado está fazendo.
10. Nas abas Display e OLED, **Undo** e **Redo** do cabeçalho (Ctrl+Z, Ctrl+Y) desfazem o
    que você mudou nas telas.

## Desenvolvimento

```
npm ci
npm run dev
```

`npm run dev` e `npm run build` executam antes `npm run generate-data`, que baixa da API do
GitHub os dados da última versão do upstream (defina `GITHUB_TOKEN` para evitar limites de
requisição). Para ver os rótulos das teclas sem um teclado:

```
npm run storybook
```

Para experimentar o app, incluindo as abas Lights, Display, OLED, Files e Diagnostics, sem
um teclado, escolha **Demo keyboard** na lista de conexões. Ele está sempre presente com
`npm run dev`; no app publicado, acrescente `?demo` ao endereço
(<https://lenerdz.github.io/zmk-studio/?demo>). **Demo keyboard (no light maps)**,
**Demo keyboard (no display settings)** e **Demo keyboard (no live status)** respondem como
um firmware sem os mapas, sem as configurações de tela e sem o estado ao vivo (o segundo
não tem nem a aba Display nem a aba OLED, porque o layout das telas é feito de configurações
de tela; o terceiro não tem a aba Diagnostics, e o Live values dele avisa que o firmware não
consegue informar o estado dele). Veja [`src/lights/demo/README.md`](src/lights/demo/README.md).

Para executar os testes:

```
npm test
```

Para compilar como o workflow faz (o site fica em `/<repository>/`):

```
VITE_BASE_PATH=/zmk-studio/ npm run build
```

O workflow executa `npm test` antes de compilar; por isso uma versão cujos testes falham
não é publicada.

Dois arquivos da aba Lights são gerados a partir de `config/led_colors.dtsi` do corne-zmk;
veja [`src/lights/README.md`](src/lights/README.md) para gerá-los de novo.

### Acompanhar o upstream

```
git remote add upstream https://github.com/zmkfirmware/zmk-studio.git
git fetch upstream
git merge upstream/main
```

Os workflows `release-please` e `tauri-build` do upstream dependem de segredos e de uma
matriz de build que este fork não tem; por isso estão desativados nas configurações do
repositório (aba Actions). Os arquivos em si são idênticos aos do upstream.

O cliente RPC está incluído no repositório (vendored); por isso o `package.json` não lista
mais `@zmkfirmware/zmk-studio-ts-client`: uma nova versão dele, ou novas mensagens do
upstream, precisam ser portadas à mão (veja
[`src/vendor/zmk-studio-ts-client`](src/vendor/zmk-studio-ts-client/README.md)).

## Arquivos alterados em relação ao upstream

Adicionados: `src/keyboard/bindingDisplay.tsx`, `src/keyboard/BindingLabel.tsx`,
`src/keyboard/Keymap.stories.tsx`, `src/keyboard/corne.mock.ts`,
`src/keyboard/keyDrag.ts`, `src/keyboard/keyDrag.test.ts`, `src/keyboard/useKeyDrag.ts`,
`src/keyboard/KeyDragGhost.tsx` (arrastar teclas, também entre camadas),
`src/keyboard/shiftLegend.ts`, `src/keyboard/shiftLegend.test.ts`,
`src/keyboard/ShiftLayoutContext.ts` (o que as teclas imprimem com Shift pressionado),
`src/lights/` (a aba Lights, o teclado de demonstração e seus testes),
`src/display/` (a aba Display, o histórico das mudanças dela e seus testes; o teclado de demonstração responde às requisições dela),
`src/oled/` (a aba OLED, os sprites dela e seus testes; o teclado de demonstração tem as configurações do layout),
`src/live/` (as duas requisições somente de leitura, o poller e o estado do teclado de demonstração),
`src/diagnostics/` (a aba Diagnostics), `src/backup/` (a aba Files),
`src/undoShortcuts.ts` (Ctrl+Z, Ctrl+Y) e o teste dele,
`scripts/oled-assets/` (transforma as imagens do zmk-nice-oled nesses sprites),
`src/vendor/zmk-studio-ts-client/` (o cliente RPC com as mensagens do fork),
`scripts/generate-led-data.mjs`, `.github/workflows/pages.yml`, `README.pt-BR.md`.

Modificados: `README.md` (substituído), `NOTICE`, `.gitignore`, `.prettierignore`, `index.html`, `download.html`,
`package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`,
`src/keyboard/Keymap.tsx`, `src/keyboard/Key.tsx`, `src/keyboard/Keyboard.tsx`,
`src/keyboard/PhysicalLayout.tsx`, `src/keyboard/LayerPicker.tsx`,
`src/keyboard/HidUsageLabel.tsx`, `src/behaviors/BehaviorBindingPicker.tsx`,
`src/hid-usage-name-overrides.json`, `src/App.tsx`,
`src/AppFooter.tsx`, `src/AppHeader.tsx`, `src/ConnectModal.tsx`, `src/DownloadPage.tsx`,
`src/rpc/logging.ts`, `src/undoRedo.ts`.

Os arquivos de código modificados trazem um comentário informando isso; nos arquivos JSON,
HTML e de texto, esta lista é o aviso.

## Licença

Apache License 2.0, como no upstream. Veja [LICENSE](LICENSE) e [NOTICE](NOTICE).
