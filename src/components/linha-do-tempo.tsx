import { StyleSheet, Text, View } from 'react-native';

import { Paleta } from '@/constants/paleta';
import { FLUXO } from '@/services/StatusService';
import type { Pedido } from '@/types';
import { ROTULO_STATUS, formatarHora } from '@/utils/pedido';

/** Etapas do pedido (R6): feitas com horário, a atual em destaque e as próximas apagadas. */
export function LinhaDoTempo({ pedido }: { pedido: Pedido }) {
  const horarioDe = (status: string) => pedido.historico.find((h) => h.status === status)?.em;
  const cancelamento = horarioDe('cancelado');

  // Cancelado: mostra só o que chegou a acontecer.
  const etapas = FLUXO[pedido.tipoEntrega].filter((e) => !cancelamento || horarioDe(e.status));

  return (
    <View>
      {etapas.map((etapa, indice) => {
        const em = horarioDe(etapa.status);
        const atual = !cancelamento && etapa.status === pedido.status;
        const ultima = indice === etapas.length - 1 && !cancelamento;

        return (
          <Passo
            key={etapa.status}
            titulo={ROTULO_STATUS[etapa.status]}
            horario={em}
            feito={em !== undefined}
            atual={atual}
            ultima={ultima}
          />
        );
      })}

      {cancelamento && (
        <Passo titulo="Cancelado" horario={cancelamento} feito atual ultima cancelado />
      )}
    </View>
  );
}

function Passo(props: {
  titulo: string;
  horario?: string;
  feito: boolean;
  atual: boolean;
  ultima: boolean;
  cancelado?: boolean;
}) {
  const cor = props.cancelado ? '#B42318' : props.feito ? Paleta.primaria : Paleta.desabilitado;

  return (
    <View style={styles.passo}>
      <View style={styles.marcador}>
        <View style={[styles.bolinha, { borderColor: cor }, props.feito && { backgroundColor: cor }]}>
          {props.feito && <Text style={styles.check}>{props.cancelado ? '✕' : '✓'}</Text>}
        </View>
        {!props.ultima && (
          <View style={[styles.traco, { backgroundColor: props.feito ? cor : Paleta.borda }]} />
        )}
      </View>

      <View style={styles.textos}>
        <Text style={[styles.titulo, !props.feito && styles.tituloPendente, props.atual && styles.tituloAtual]}>
          {props.titulo}
        </Text>
        <Text style={styles.horario}>
          {props.horario ? formatarHora(props.horario) : 'aguardando'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  passo: { flexDirection: 'row', minHeight: 52 },
  marcador: { width: 30, alignItems: 'center' },
  bolinha: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Paleta.superficie,
  },
  check: { color: Paleta.textoSobrePrimaria, fontSize: 12, fontWeight: 'bold' },
  traco: { flex: 1, width: 2, marginVertical: 2 },
  textos: { flex: 1, paddingLeft: 10, paddingBottom: 12 },
  titulo: { fontSize: 15, fontWeight: '600', color: Paleta.texto },
  tituloPendente: { color: Paleta.textoSuave, fontWeight: 'normal' },
  tituloAtual: { color: Paleta.primaria, fontWeight: 'bold' },
  horario: { fontSize: 13, color: Paleta.textoSuave, marginTop: 2 },
});
