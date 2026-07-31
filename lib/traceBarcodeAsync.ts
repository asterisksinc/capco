import { EntityType, LineageNode, detectEntityType } from "./traceBarcode";
import { inventoryService } from "@/src/services/inventoryService";
import { workOrderService } from "@/src/services/workOrderService";
import { productionStageService } from "@/src/services/productionStageService";
import { productOrderService } from "@/src/services/productOrderService";
import { supabaseRest } from "@/src/services/supabaseClient";

export interface DownstreamInfo {
  type: EntityType;
  label: string;
  count: number;
  nodes: LineageNode[];
}

export interface AsyncLineageResult {
  nodes: LineageNode[]; // Upstream + Scanned
  downstream: DownstreamInfo | null;
}

export async function resolveLineageChainAsync(rawId: string): Promise<AsyncLineageResult | null> {
  let cleanId = rawId.toUpperCase().trim();
  if (cleanId.startsWith("STOCK-")) {
    cleanId = "PM-" + cleanId.substring(6);
  }
  const startType = detectEntityType(cleanId);
  if (startType === "Unknown") return null;

  const nodes: LineageNode[] = [];
  let downstream: DownstreamInfo | null = null;

  const buildNode = (type: EntityType, id: string, label: string, details: { label: string; value: string }[], status: string, rawRecord?: any): LineageNode => ({
    type, id, label, details, status, rawRecord
  });

  try {
    if (startType === "PM") {
      const pmList = await productionStageService.listSlitting({ filters: { product_no: cleanId } });
      const pm = pmList[0] as any;
      if (pm) {
        nodes.push(buildNode("PM", pm.product_no || pm.slitting_no || pm.id, `Product ${pm.product_no || pm.slitting_no || pm.id}`, [
          { label: "Weight", value: `${pm.weight_kg || 0} kg` },
          { label: "Thickness", value: `${pm.thickness_micron || 0} µm` },
          { label: "Grade", value: pm.grade || "—" },
          { label: "Remarks", value: pm.remarks || "—" },
        ], pm.status));

        // Downstream WD
        const wdList = await productionStageService.listWinding({ filters: { product_material_id: pm.id } });
        if (wdList && wdList.length > 0) {
          downstream = {
            type: "WD",
            label: "Winding Rolls",
            count: wdList.length,
            nodes: wdList.map((wd: any) => buildNode("WD", wd.winding_no, `Winding ${wd.winding_no}`, [{ label: "Qty Wound", value: `${wd.quantity_wound} units` }], wd.status))
          };
        } else {
           // Maybe PO downstream
           const poMats = await supabaseRest.list("product_order_materials", { filters: { stock_id: pm.id } });
           if (poMats && poMats.length > 0) {
              const pos = await Promise.all(poMats.map(async (pm: any) => {
                 return productOrderService.getById(pm.product_order_id);
              }));
              downstream = {
                 type: "PO",
                 label: "Product Orders",
                 count: pos.length,
                 nodes: pos.filter(Boolean).map((po: any) => buildNode("PO", po.product_order_no, `Product Order ${po.product_order_no}`, [{ label: "Type", value: po.capacitor_type }], po.status))
              };
           }
        }

        // Upstream MC
        if (pm.metallisation_id) {
          const mc: any = await productionStageService.getMetallisationById(pm.metallisation_id);
          if (mc) {
            nodes.push(buildNode("MC", mc.metallisation_no || mc.id, `Metallisation ${mc.metallisation_no || mc.id}`, [{ label: "Machine", value: mc.machine_no || "—" }, { label: "Weight", value: `${mc.weight_kg || 0} kg` }, { label: "Optical Density", value: `${mc.optical_density || 0}` }], mc.status, mc));

            // Upstream WO
            if (mc.work_order_id) {
              const wo: any = await workOrderService.getById(mc.work_order_id);
              if (wo) {
                nodes.push(buildNode("WO", wo.work_order_no || wo.id, `Work Order ${wo.work_order_no || wo.id}`, [
                  { label: "Micron", value: `${wo.micron}` },
                  { label: "Width", value: `${wo.width_m || wo.width}m` },
                  { label: "Qty", value: `${wo.quantity} kg` },
                ], wo.status));
                
                // Upstream RM from WO materials
                if (wo.work_order_materials && wo.work_order_materials.length > 0) {
                  const specificMat = wo.work_order_materials.find((m: any) => m.inventory_id === mc.raw_material_id);
                  const mat = specificMat || wo.work_order_materials[0];
                  if (mat && mat.inventory) {
                    nodes.push(buildNode("RM", mat.inventory.raw_material_code || mat.inventory.roll_no, `Raw Material ${mat.inventory.raw_material_code || mat.inventory.roll_no}`, [
                      { label: "Supplier", value: mat.inventory.supplier || "—" },
                      { label: "Weight", value: `${mat.inventory.net_weight_kg || 0} kg` },
                    ], mat.inventory.status));
                  }
                }
              }
            }
          }
        }
      }
    } else if (startType === "MC") {
      const mcList = await productionStageService.listMetallisation({ filters: { metallisation_no: cleanId } });
      const mc = mcList[0] as any;
      if (mc) {
        nodes.push(buildNode("MC", mc.metallisation_no || mc.id, `Metallisation ${mc.metallisation_no || mc.id}`, [{ label: "Machine", value: mc.machine_no || "—" }, { label: "Weight", value: `${mc.weight_kg || 0} kg` }, { label: "Optical Density", value: `${mc.optical_density || 0}` }], mc.status, mc));

        // Downstream PM
        const pmList = await productionStageService.listSlitting({ filters: { metallisation_id: mc.id } });
        if (pmList && pmList.length > 0) {
          downstream = {
            type: "PM",
            label: "Slitting Rolls",
            count: pmList.length,
            nodes: pmList.map((pm: any) => buildNode("PM", pm.product_no || pm.slitting_no || pm.id, `Product ${pm.product_no || pm.slitting_no || pm.id}`, [{ label: "Weight", value: `${pm.weight_kg || 0} kg` }, { label: "Grade", value: pm.grade || "—" }], pm.status))
          };
        }

        // Upstream WO
        if (mc.work_order_id) {
          const wo = await workOrderService.getById(mc.work_order_id) as any;
          if (wo) {
            nodes.push(buildNode("WO", wo.work_order_no || wo.id, `Work Order ${wo.work_order_no || wo.id}`, [
              { label: "Micron", value: `${wo.micron}` },
              { label: "Width", value: `${wo.width_m || wo.width}m` },
              { label: "Qty", value: `${wo.quantity} kg` },
            ], wo.status));
            
            // Upstream RM from WO materials
            if (wo.work_order_materials && wo.work_order_materials.length > 0) {
              const specificMat = wo.work_order_materials.find((m: any) => m.inventory_id === mc.raw_material_id);
              const mat = specificMat || wo.work_order_materials[0];
              if (mat && mat.inventory) {
                nodes.push(buildNode("RM", mat.inventory.raw_material_code || mat.inventory.roll_no, `Raw Material ${mat.inventory.raw_material_code || mat.inventory.roll_no}`, [
                  { label: "Supplier", value: mat.inventory.supplier || "—" },
                  { label: "Weight", value: `${mat.inventory.net_weight_kg || 0} kg` },
                ], mat.inventory.status));
              }
            }
          }
        }
      }
    } else if (startType === "WO") {
      const woList = await supabaseRest.list("work_orders", { filters: { work_order_no: cleanId } });
      const woIdRaw = (woList[0] as any)?.id;
      if (woIdRaw) {
        const wo = await workOrderService.getById(woIdRaw) as any;
        if (wo) {
          nodes.push(buildNode("WO", wo.work_order_no || wo.id, `Work Order ${wo.work_order_no || wo.id}`, [
            { label: "Micron", value: `${wo.micron}` },
            { label: "Width", value: `${wo.width_m || wo.width}m` },
            { label: "Qty", value: `${wo.quantity} kg` },
          ], wo.status));

          // Downstream MC
          const mcList = await productionStageService.listMetallisation({ filters: { work_order_id: wo.id } });
          if (mcList && mcList.length > 0) {
            downstream = {
              type: "MC",
              label: "Metallisation Coils",
              count: mcList.length,
              nodes: mcList.map((mc: any) => buildNode("MC", mc.metallisation_no || mc.id, `Metallisation ${mc.metallisation_no || mc.id}`, [{ label: "Machine", value: mc.machine_no || "—" }, { label: "Weight", value: `${mc.weight_kg || 0} kg` }], mc.status, mc))
            };
          } else {
             // If no MC, maybe Slitting directly?
             const pmList = await productionStageService.listSlitting({ filters: { work_order_id: wo.id } });
             if (pmList && pmList.length > 0) {
                 downstream = {
                   type: "PM",
                   label: "Slitting Rolls",
                   count: pmList.length,
                   nodes: pmList.map((pm: any) => buildNode("PM", pm.product_no || pm.slitting_no || pm.id, `Product ${pm.product_no || pm.slitting_no || pm.id}`, [{ label: "Weight", value: `${pm.weight_kg || 0} kg` }, { label: "Grade", value: pm.grade || "—" }], pm.status))
                 };
             }
          }

          // Upstream RM from WO materials
          if (wo.work_order_materials && wo.work_order_materials.length > 0) {
            for (const mat of wo.work_order_materials) {
              if (mat.inventory) {
                nodes.push(buildNode("RM", mat.inventory.raw_material_code || mat.inventory.roll_no, `Raw Material ${mat.inventory.raw_material_code || mat.inventory.roll_no}`, [
                  { label: "Supplier", value: mat.inventory.supplier || "—" },
                  { label: "Weight", value: `${mat.inventory.net_weight_kg || 0} kg` },
                ], mat.inventory.status));
              }
            }
          }
        }
      }
    } else if (startType === "RM") {
       const invList = await supabaseRest.list("inventory", { filters: { raw_material_code: cleanId } });
       let inv = invList[0] as any;
       if (!inv) {
          const invListRoll = await supabaseRest.list("inventory", { filters: { roll_no: cleanId } });
          inv = invListRoll[0] as any;
       }
       if (inv) {
          nodes.push(buildNode("RM", inv.raw_material_code || inv.roll_no, `Raw Material ${inv.raw_material_code || inv.roll_no}`, [
            { label: "Supplier", value: inv.supplier || "—" },
            { label: "Weight", value: `${inv.net_weight_kg || 0} kg` },
            { label: "Thickness", value: `${inv.micron || 0} µm` },
          ], inv.status));

          // Downstream WO
          const woMats = await supabaseRest.list("work_order_materials", { filters: { inventory_id: inv.id } });
          if (woMats && woMats.length > 0) {
             const wos = await Promise.all(woMats.map(async (m: any) => {
                return workOrderService.getById(m.work_order_id);
             }));
             downstream = {
               type: "WO",
               label: "Work Orders",
               count: wos.length,
               nodes: wos.filter(Boolean).map((wo: any) => buildNode("WO", wo.work_order_no || wo.id, `Work Order ${wo.work_order_no || wo.id}`, [{ label: "Micron", value: `${wo.micron}` }, { label: "Qty", value: `${wo.quantity} kg` }], wo.status))
             };
          }
       }
    } else if (startType === "PO") {
       const poList = await supabaseRest.list("product_orders", { filters: { product_order_no: cleanId } });
       if (poList.length === 0) {
           const poListHash = await supabaseRest.list("product_orders", { filters: { product_order_no: cleanId.replace("#", "") } });
           if (poListHash.length > 0) poList[0] = poListHash[0];
       }
       
       const poRaw = poList[0] as any;
       if (poRaw) {
          const po = await productOrderService.getById(poRaw.id) as any;
          if (po) {
             nodes.push(buildNode("PO", po.product_order_no || po.id, `Product Order ${po.product_order_no || po.id}`, [
                { label: "Code", value: po.product_code || "—" },
                { label: "Type", value: po.capacitor_type || "—" },
                { label: "Grade", value: po.grade || "—" },
                { label: "Qty", value: `${po.quantity || 0}` }
             ], po.status));

             // Downstream WD/SP? Actually POs might have downstream WIP like Winding and Spray. 
             // We'll leave downstream for PO empty for now unless needed, or maybe WD is downstream.
             if (po.winding && po.winding.length > 0) {
                downstream = {
                   type: "WD",
                   label: "Winding Rolls",
                   count: po.winding.length,
                   nodes: po.winding.map((wd: any) => buildNode("WD", wd.winding_no, `Winding ${wd.winding_no}`, [{ label: "Qty Wound", value: `${wd.quantity_wound} units` }], wd.status))
                };
             }

             // Upstream PM
             if (po.product_order_materials && po.product_order_materials.length > 0) {
                for (const mat of po.product_order_materials) {
                   if (mat.stock && mat.stock.slitting_id) {
                      const pm = await productionStageService.getSlittingById(mat.stock.slitting_id) as any;
                      if (pm) {
                         nodes.push(buildNode("PM", pm.product_no || pm.slitting_no || pm.id, `Product ${pm.product_no || pm.slitting_no || pm.id}`, [{ label: "Weight", value: `${pm.weight_kg || 0} kg` }, { label: "Grade", value: pm.grade || "—" }], pm.status));
                         // Upstream MC
                         if (pm.metallisation_id) {
                            const mc: any = await productionStageService.getMetallisationById(pm.metallisation_id);
                            if (mc) {
                               nodes.push(buildNode("MC", mc.metallisation_no || mc.id, `Metallisation ${mc.metallisation_no || mc.id}`, [{ label: "Machine", value: mc.machine_no || "—" }], mc.status, mc));
                               if (mc.work_order_id) {
                                  const wo = await workOrderService.getById(mc.work_order_id) as any;
                                  if (wo) {
                                     nodes.push(buildNode("WO", wo.work_order_no || wo.id, `Work Order ${wo.work_order_no || wo.id}`, [{ label: "Qty", value: `${wo.quantity} kg` }], wo.status));
                                     if (wo.work_order_materials && wo.work_order_materials.length > 0) {
                                        const specificMat = wo.work_order_materials.find((m: any) => m.inventory_id === mc.raw_material_id);
                                        const mat2 = specificMat || wo.work_order_materials[0];
                                        if (mat2 && mat2.inventory) {
                                           nodes.push(buildNode("RM", mat2.inventory.raw_material_code || mat2.inventory.roll_no, `Raw Material ${mat2.inventory.raw_material_code || mat2.inventory.roll_no}`, [{ label: "Supplier", value: mat2.inventory.supplier || "—" }], mat2.inventory.status));
                                        }
                                     }
                                  }
                               }
                            }
                         }
                      }
                   }
                }
             }
          }
       }
    }

    if (nodes.length === 0) return null;

    // Reverse nodes so it is RM -> WO -> MC -> PM
    nodes.reverse();

    return {
      nodes,
      downstream
    };
  } catch (err) {
    console.error("Failed to resolve lineage:", err);
    return null;
  }
}
