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

O que não muda: a edição do keymap e o que o app lê do teclado ou grava nele para isso.
Os ícones afetam apenas como as teclas são desenhadas e como o app é hospedado; arrastar
teclas (abaixo) grava com a mesma requisição do seletor de binding; a aba Lights (mais
abaixo) acrescenta requisições próprias e só é usada quando o firmware as tem.

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

Para experimentar o app, incluindo a aba Lights, sem um teclado, escolha **Demo keyboard**
na lista de conexões. Ele está sempre presente com `npm run dev`; no app publicado,
acrescente `?demo` ao endereço (<https://lenerdz.github.io/zmk-studio/?demo>). **Demo
keyboard (no light maps)** responde como um firmware sem os mapas. Veja
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
`src/vendor/zmk-studio-ts-client/` (o cliente RPC com as mensagens do fork),
`scripts/generate-led-data.mjs`, `.github/workflows/pages.yml`, `README.pt-BR.md`.

Modificados: `README.md` (substituído), `NOTICE`, `.gitignore`, `index.html`, `download.html`,
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
