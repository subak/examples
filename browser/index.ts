import {merge} from "rxjs";
import {LifecyclePort, source, sink, Socket} from "pkit/core";
import {directProc, mapProc, mapToProc} from "pkit/processors";
import {workerKit, WorkerParams, WorkerPort, parentRemoteWorkerKit} from "pkit/worker";
import {Port as ServicePort} from "../service/"
import {snabbdomKit, SnabbdomParams, SnabbdomPort} from "@pkit/snabbdom";

export type Params = {
  worker: WorkerParams,
  snabbdom: SnabbdomParams
}

export class Port extends LifecyclePort<Params> {
  service = new class extends WorkerPort {
    ifs = new ServicePort;
  };
  snabbdom = new SnabbdomPort;
  state = new Socket<any>();
}

export const circuit = (port: Port) =>
  merge(
    useWorkerKit(port),
    useSnabbdomKit(port),
    directProc(source(port.service.ifs.state.raw), sink(port.state))
  )

const useWorkerKit = (port: Port) =>
  merge(
    workerKit(port.service),
    parentRemoteWorkerKit(port.service, [
      port.service.ifs.state.init
    ], port.service.ifs),
    mapProc(source(port.init), sink(port.service.init),
      ({worker}) => worker),
    mapToProc(source(port.init), sink(port.service.running), true)
  )

const useSnabbdomKit = (port: Port) =>
  merge(
    snabbdomKit(port.snabbdom),
    mapProc(source(port.init), sink(port.snabbdom.init), ({snabbdom}) => snabbdom),
    directProc(source(port.service.ifs.vnode), sink(port.snabbdom.render)),
  )