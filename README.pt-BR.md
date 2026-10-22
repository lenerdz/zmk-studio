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

O que não muda: a edição do keymap e o que o app lê do teclado ou grava nele para isso.
Os ícones afetam apenas como as teclas são desenhadas e como o app é hospedado; arrastar
teclas (abaixo) grava com a mesma requisição do seletor de binding; as abas Lights e
Display (mais abaixo) acrescentam requisições próprias, e a aba OLED usa as da aba
Display. As três abas só são usadas quando o firmware tem o que elas editam.

## Mover teclas arrastando (a visão Keys)

Na visão **Keys**, pressione uma tecla e arraste-a sobre outra tecla da mesma camada:

- **Solte** sobre outra tecla e as duas teclas **trocam** de binding (comportamento e
  parâmetros). Segure **Ctrl** ou **Alt**, antes ou durante o arraste, e o drop
  **copia**: a tecla sobre a qual você soltou recebe o binding da tecla arrastada, e a
  tecla arrastada continua como estava.
- Durante o arraste, a tecla pressionada fica esmaecida com um contorno tracejado, uma
  cópia menor dela segue o ponteiro com uma etiqueta (`Swap` ou `Copy`) e a tecla sob o
  ponteiro é destacada. A etiqueta mostra `drop on a key` enquanto o ponteiro não está
  sobre nenhuma tecla.
- **Esc** cancela o arraste. Soltar o ponteiro em qualquer lugar que não seja uma tecla
  não faz nada.
- O arraste começa depois que o ponteiro se move 6 pixels; por isso um clique simples
  continua selecionando a tecla. Depois de um drop, a tecla sobre a qual você soltou fica
  selecionada, o que mostra o binding dela no seletor logo abaixo.
- Um drop é **um passo** de Undo e de Redo, mesmo numa troca, que altera duas teclas. Ele
  é gravado no teclado com a requisição `setLayerBinding`, a mesma que o seletor de binding
  usa; por isso **Save** e **Discard** funcionam como antes. Se o teclado recusar uma
  gravação, as teclas já gravadas voltam ao que eram e o app mostra um alerta.
- Teclas giradas (as teclas do polegar do Corne) e as teclas da metade direita funcionam
  como qualquer outra. Mouse, caneta e toque usam os mesmos eventos de ponteiro.

As regras (o que um drop faz, como um arraste começa, termina e é cancelado) são funções
puras em [`src/keyboard/keyDrag.ts`](src/keyboard/keyDrag.ts), cobertas por
[`src/keyboard/keyDrag.test.ts`](src/keyboard/keyDrag.test.ts).
[`src/keyboard/useKeyDrag.ts`](src/keyboard/useKeyDrag.ts) escuta o ponteiro,
[`src/keyboard/KeyDragGhost.tsx`](src/keyboard/KeyDragGhost.tsx) desenha o que o segue e a
edição em si (`doDropKey`, `writeEdits`) está em
[`src/keyboard/Keyboard.tsx`](src/keyboard/Keyboard.tsx).

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
edita). Ela define o que as telas OLED do teclado fazem:

- O **contraste** da tela esquerda e da tela direita, com um controle deslizante (slider)
  para cada uma.
- **Quando as telas apagam**: nunca, só na bateria (enquanto o USB não está conectado
  àquela metade) ou sempre, e depois de quanto tempo sem atividade.
- O **toast das luzes**: se a tela direita mostra um aviso quando as luzes mudam (efeito,
  brilho, ligar e desligar) e por quanto tempo.
- **Restore defaults** devolve todas as configurações ao que o firmware tinha ao ser
  compilado.

Tudo é aplicado pelo teclado na hora e guardado por ele alguns segundos depois da última
mudança; por isso não há nada para salvar: **Save**, **Discard**, **Undo** e **Redo** não
agem sobre essas configurações. **Restore Stock Settings** também as devolve aos padrões.
O que cada tela mostra, e onde, é definido na aba OLED (abaixo) quando o firmware tem o
layout das telas OLED; o idioma do toast e o que a aba OLED não cobre continuam sendo
escolhidos quando o firmware é compilado.

Ela precisa do módulo [zmk-rgb-matrix](https://github.com/lenerdz/zmk-rgb-matrix) de
lenerdz (branch `corne-fixes`, compilado com `CONFIG_KEYPAW_DISPLAY_SETTINGS=y`), do fork
[zmk-nice-oled](https://github.com/lenerdz/zmk-nice-oled) (que lê as configurações do
toast) e do protocolo do
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
- **Escolha a imagem da tela direita** em uma galeria de 26 imagens, em dois grupos: 16
  animações (Gem, Cat, Head, Spaceman, Pokemon e mais 11: Equalizer, Radar, Heartbeat,
  Digital rain, Wire cube, Atom, Helix, Warp, Sonar, Bouncing ball, Flame) e 10 imagens
  fixas (Vim, VIPs Marcos e mais 8: Mountains, Skyline, Circuit, Alien, Heart, Keyboard,
  Pulsar, Rocket), cada uma tocando no seu cartão, com o tamanho e o tempo de um ciclo.
  Clique em uma, ou arraste-a para a tela direita, e ajuste o tempo de um ciclo.
- **Gire a imagem** um quarto de volta para qualquer lado, **corte-a** em um pedaço que se
  seleciona com uma moldura (arraste-a, redimensione-a ou digite os números dela) e escolha
  **como os widgets se misturam com ela**: mostrados em reverso onde estão sobre uma parte
  acesa da imagem, para continuarem legíveis (o padrão), ou somados a ela. O firmware
  desenha a imagem por cima dos widgets, então qualquer widget, inclusive a bateria da
  metade direita, pode ser movido para cima dela.
- **Veja o que as telas podem mostrar**, com o tamanho de cada coisa, e quais escolhas só
  um novo build do firmware acrescenta (o cachorro Luna, o gato Bongo, os indicadores de
  modificadores, o Raw HID, ...), cada uma com a opção a ligar.

Tudo é aplicado pelo teclado na hora e guardado por ele alguns segundos depois da última
mudança; por isso não há nada para salvar: **Save**, **Discard**, **Undo** e **Redo** não
agem sobre o layout. **Restore Stock Settings**, e **Restore defaults** da aba Display,
devolvem o layout ao que o firmware tinha ao ser compilado. Os desenhos são amostras, não o
estado ao vivo das telas.

Ela precisa do que a aba Display precisa, com `CONFIG_KEYPAW_OLED_LAYOUT=y` no build das
duas metades, e do fork [zmk-nice-oled](https://github.com/lenerdz/zmk-nice-oled) de
lenerdz, que lê o layout enquanto o teclado funciona. Ela não tem requisições próprias: o
layout é feito de configurações de tela (ids de 16 em diante), lidas e gravadas com as três
requisições da aba Display. Com qualquer outro firmware a visão OLED não é oferecida e o
app funciona como antes.

Como a geometria funciona (o canvas de 68 x 160 pixels, a faixa de 32 x 128 que o painel
mostra, a posição da imagem), os ids, os arquivos e como os sprites são gerados:
[`src/oled/README.md`](src/oled/README.md).

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
não tem a aba Display. Ela é coberta por `npm test`. **Não foi testada em um teclado
real**.

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
funcionou, sem detalhar cada operação, então nenhuma delas tem confirmação individual. O
que foi acrescentado depois dela (girar, cortar e misturar a imagem, o reverso onde um
widget está sobre ela e as 19 imagens novas) **não foi testado em um teclado real**: a
prévia disso se baseia no código do firmware e nos testes dele em um computador, não na
tela. O toque não foi testado em nenhum dispositivo.

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
edição de uma tecla pelo seletor depois. As regras são cobertas por `npm test`. Ele
**não foi testado em um teclado real**, e o toque não foi testado em nenhum dispositivo.

## Como usar

1. Abra a página em um navegador com suporte a WebSerial (Chrome, Edge ou outro
   navegador baseado em Chromium). Firefox e Safari não têm.
2. O firmware do teclado precisa ter o ZMK Studio habilitado; veja a
   [documentação do ZMK Studio](https://zmk.dev/docs/features/studio).
3. Conecte o teclado por USB (em um teclado dividido, a metade que executa o Studio, a
   central), escolha **USB** e desbloqueie com a tecla associada a `&studio_unlock`.
4. Em **Keys**, clique em uma tecla para editá-la, ou arraste-a sobre outra tecla para
   trocar as duas (segure Ctrl ou Alt para copiar).
5. Se o firmware tiver mapas de luzes editáveis, escolha **Lights** no cabeçalho para
   editar as cores.
6. Se o firmware tiver configurações de tela, escolha **Display** para ajustar as telas.
7. Se o firmware tiver o layout das telas OLED, escolha **OLED** para mover os widgets das
   duas telas e escolher a animação da tela direita.

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

Para experimentar o app, incluindo as abas Lights, Display e OLED, sem um teclado, escolha
**Demo keyboard** na lista de conexões. Ele está sempre presente com `npm run dev`; no app
publicado, acrescente `?demo` ao endereço (<https://lenerdz.github.io/zmk-studio/?demo>).
**Demo keyboard (no light maps)** e **Demo keyboard (no display settings)** respondem como
um firmware sem os mapas e sem as configurações de tela (o segundo não tem nem a aba
Display nem a aba OLED, porque o layout das telas é feito de configurações de tela). Veja
[`src/lights/demo/README.md`](src/lights/demo/README.md).

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
`src/keyboard/KeyDragGhost.tsx` (arrastar teclas),
`src/lights/` (a aba Lights, o teclado de demonstração e seus testes),
`src/display/` (a aba Display e seus testes; o teclado de demonstração responde às requisições dela),
`src/oled/` (a aba OLED, os sprites dela e seus testes; o teclado de demonstração tem as configurações do layout),
`scripts/oled-assets/` (transforma as imagens do zmk-nice-oled nesses sprites),
`src/vendor/zmk-studio-ts-client/` (o cliente RPC com as mensagens do fork),
`scripts/generate-led-data.mjs`, `.github/workflows/pages.yml`, `README.pt-BR.md`.

Modificados: `README.md` (substituído), `NOTICE`, `.gitignore`, `.prettierignore`, `index.html`, `download.html`,
`package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`,
`src/keyboard/Keymap.tsx`, `src/keyboard/Key.tsx`, `src/keyboard/Keyboard.tsx`,
`src/keyboard/PhysicalLayout.tsx`, `src/behaviors/BehaviorBindingPicker.tsx`,
`src/hid-usage-name-overrides.json`, `src/App.tsx`,
`src/AppFooter.tsx`, `src/AppHeader.tsx`, `src/ConnectModal.tsx`, `src/DownloadPage.tsx`,
`src/rpc/logging.ts`, `src/undoRedo.ts`.

Os arquivos de código modificados trazem um comentário informando isso; nos arquivos JSON,
HTML e de texto, esta lista é o aviso.

## Licença

Apache License 2.0, como no upstream. Veja [LICENSE](LICENSE) e [NOTICE](NOTICE).
