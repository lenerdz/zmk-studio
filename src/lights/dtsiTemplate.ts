/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * GENERATED, do not edit by hand (scripts/generate-led-data.mjs). The part of
 * config/led_colors.dtsi of lenerdz/corne-zmk that does not depend on the
 * colors: the explanation, the palette and the LED_SLOTS macros. It is a copy of
 * the start of that file (everything before the block of the first layer); the
 * exported file is this text followed by the block of each layer.
 */
export const DTSI_HEADER = String.raw`/*
 * Cores de cada LED em cada camada (zmk-rgb-matrix, efeito "static").
 *
 * Este arquivo e incluido no final de corne.keymap. Cada bloco "&map_<camada>"
 * preenche o slot-colors do efeito static de uma camada: o de um overlay de
 * camada (FN1 a MEDIA, cobrem os 27 LEDs de cada metade enquanto a camada esta
 * ativa) ou o do efeito fx_static (mapa da camada base, QWERTY). A estrutura
 * (overlays, condicoes, efeitos e o layer-id de cada mapa) fica em
 * corne.keymap; aqui ficam so as cores.
 *
 * Estas sao as cores PADRAO, as que o firmware tem de fabrica. O firmware
 * deixa editar e salvar as cores de cada slot no teclado (ZMK Studio, com o
 * fork lenerdz/zmk-studio-messages): o que for salvo vale no lugar destas, so
 * nos slots alterados, e RGB_RESET volta tudo para o que esta escrito aqui.
 *
 * COMO EDITAR
 *   Troque o nome da cor de uma posicao. Cada metade tem 3 linhas de 6 teclas,
 *   os 3 polegares e os 6 LEDs de underglow, nesta ordem:
 *
 *     esquerda:   0  1  2  3  4  5       direita:   6  7  8  9 10 11
 *                12 13 14 15 16 17                 18 19 20 21 22 23
 *                24 25 26 27 28 29                 30 31 32 33 34 35
 *                         36 37 38                 39 40 41
 *
 *   OFF apaga o LED. O comentario ao lado de cada linha diz que tecla era
 *   aquela no keymap quando o mapa foi escrito (se mudar a tecla, atualize a
 *   cor e o comentario).
 *
 * REGRAS
 *   - Dentro de LED_SLOTS(...) use so comentarios do tipo barra-asterisco. Um
 *     comentario de duas barras engole o resto da linha depois do pre-processador
 *     e apaga cores sem avisar.
 *   - O primeiro grupo e o das teclas da esquerda e o segundo o das teclas da
 *     direita. Os grupos tem sempre 27 valores (21 teclas + 6 de underglow).
 *   - As cores sao 0xRRGGBB com brilho cheio. O brilho real vem do kprgb
 *     (RGB_BRI e RGB_BRD, max-brightness) e vale para todas as cores igualmente.
 */

/*
 * Paleta. Para criar uma cor nova, acrescente uma linha (nome e 0xRRGGBB).
 */
#define OFF 0x000000 /* apagado */
#define WHT 0xFFFFFF /* branco */
#define RED 0xFF0000 /* vermelho */
#define ORG 0xFF8000 /* laranja */
#define YEL 0xFFFF00 /* amarelo */
#define LIM 0x80FF00 /* verde-limao */
#define GRN 0x00FF00 /* verde */
#define TEA 0x00FF80 /* verde-agua */
#define CYN 0x00FFFF /* ciano */
#define SKY 0x0080FF /* azul-claro */
#define BLU 0x0000FF /* azul */
#define PUR 0x8000FF /* roxo */
#define MAG 0xFF00FF /* magenta */
#define PNK 0xFF0080 /* rosa */

/*
 * Slots (a posicao de cada cor na lista slot-colors, 0 a 53). Sao os mesmos
 * nas duas metades, por isso a mesma lista vale para as duas:
 *   0 a 41  : a tecla de mesma posicao no keymap (k0 a k41)
 *   42 a 47 : underglow da esquerda (u0 a u5, na ordem da fita da esquerda)
 *   48 a 53 : underglow da direita (u0 a u5, na ordem da fita da direita)
 * "no-key-slots" e "slot-count" de corne_left.overlay e corne_right.overlay
 * dizem ao firmware qual LED usa qual slot.
 *
 * LED_SLOTS(esquerda, direita) recebe os dois grupos como estao escritos nos
 * blocos abaixo (cada um com 27 cores, na ordem dos parametros de
 * LED_SLOT_ORDER) e devolve as 54 cores na ordem dos slots.
 */
#define LED_UNPAREN(...) __VA_ARGS__
#define LED_APPLY(macro, ...) macro(__VA_ARGS__)
#define LED_SLOTS(left, right)                                                 \
    LED_APPLY(LED_SLOT_ORDER, LED_UNPAREN left, LED_UNPAREN right)

#define LED_SLOT_ORDER(                                                        \
    k0,  k1,  k2,  k3,  k4,  k5,                                               \
    k12, k13, k14, k15, k16, k17,                                              \
    k24, k25, k26, k27, k28, k29,                                              \
                   k36, k37, k38,                                              \
    l0,  l1,  l2,  l3,  l4,  l5,                                               \
    k6,  k7,  k8,  k9,  k10, k11,                                              \
    k18, k19, k20, k21, k22, k23,                                              \
    k30, k31, k32, k33, k34, k35,                                              \
    k39, k40, k41,                                                             \
    r0,  r1,  r2,  r3,  r4,  r5)                                               \
    k0  k1  k2  k3  k4  k5  k6  k7  k8  k9  k10 k11                            \
    k12 k13 k14 k15 k16 k17 k18 k19 k20 k21 k22 k23                            \
    k24 k25 k26 k27 k28 k29 k30 k31 k32 k33 k34 k35                            \
    k36 k37 k38 k39 k40 k41                                                    \
    l0  l1  l2  l3  l4  l5  r0  r1  r2  r3  r4  r5
`;
