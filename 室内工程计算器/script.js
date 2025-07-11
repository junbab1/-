document.getElementById('budget-form').addEventListener('submit', function(event) {
    event.preventDefault();

    // --- 获取所有输入值 ---
    const inputs = {};
    const formElements = document.getElementById('budget-form').elements;
    for (let i = 0; i < formElements.length; i++) {
        const element = formElements[i];
        if (element.id) {
            inputs[element.id] = parseFloat(element.value) || 0;
        }
    }

    // 墙面刷漆面积根据建筑面积自动计算
    inputs.wall_paint = inputs.building_area * 2.5;

    // --- 核心数据与计算逻辑 ---
    const comprehensivePrices = {
        // 拆除工程
        demolish_ground_tile: { name: '拆除地面瓷砖', unit: 'm²', price: 25 },
        demolish_wall_surface: { name: '铲除墙面腻子', unit: 'm²', price: 15 },
        demolish_wall_tile: { name: '拆除墙面瓷砖', unit: 'm²', price: 30 },
        demolish_wall: { name: '拆除墙体', unit: 'm', price: 80 }, // 按米，不分厚度
        demolish_window: { name: '拆除飘窗', unit: 'm', price: 120 },

        // 泥水工程
        new_wall: { name: '新建墙体', unit: 'm²', price: 180 }, // 按面积
        wall_plaster: { name: '墙面抹灰', unit: 'm²', price: 45 },
        ground_leveling: { name: '地面找平', unit: 'm²', price: 40 },
        waterproof: { name: '防水处理', unit: 'm²', price: 70 },
        tile_paste_ground: { name: '地面铺贴人工', unit: 'm²', price: 55 },
        tile_paste_wall: { name: '墙面铺贴人工', unit: 'm²', price: 65 },
        cement_mortar: { name: '水泥砂浆辅料', unit: 'm²', price: 35 }, // 用于铺贴

        // 木作工程
        ceiling_flat: { name: '平面吊顶', unit: 'm²', price: 130 },
        ceiling_shaped: { name: '异型吊顶', unit: 'm²', price: 180 },
        cabinet_projection: { name: '定制柜（投影）', unit: 'm²', price: 800 },
        cabinet_unfold: { name: '定制柜（展开）', unit: 'm²', price: 350 },

        // 油漆工程
        wall_paint: { name: '墙面乳胶漆', unit: 'm²', price: 40 }, // 包含腻子和底漆

        // 水电工程
        water_electric: { name: '水电改造', unit: 'm²', price: 220 }, // 按建筑面积计算

        // 固定/管理费用
        debris_removal: { name: '垃圾清理与成品保护', unit: 'm²', price: 60 }, // 按建筑面积计算
        material_handling: { name: '材料搬运费', unit: '项', price: 3000 },
    };

    const decorationGrade = inputs.decorationGrade || 1.0;
    const laborCostFactor = inputs.laborCostFactor || 1.0;

    const budgetItems = [];
    let engineeringCost = 0;

    // --- 计算函数定义 ---
    const calculateCost = (itemId, quantity, isFixed = false, isSpecial = false) => {
        if (quantity > 0) {
            const item = comprehensivePrices[itemId];
            const adjustedPrice = isFixed ? item.price : item.price * decorationGrade * laborCostFactor;
            const cost = quantity * adjustedPrice;
            budgetItems.push({
                name: item.name,
                quantity: quantity,
                unit: isSpecial ? item.unit + ' (含异型)' : item.unit,
                price: adjustedPrice.toFixed(2),
                total: cost.toFixed(2)
            });
            return cost;
        }
        return 0;
    };

    // --- 分项计算 ---
    // 拆除工程
    engineeringCost += calculateCost('demolish_ground_tile', inputs.demolish_ground_tile);
    engineeringCost += calculateCost('demolish_wall_surface', inputs.demolish_wall_surface);
    engineeringCost += calculateCost('demolish_wall_tile', inputs.demolish_wall_tile);
    engineeringCost += calculateCost('demolish_wall', inputs.demolish_wall);
    engineeringCost += calculateCost('demolish_window', inputs.demolish_window);

    // 泥水工程
    engineeringCost += calculateCost('new_wall', inputs.new_wall);
    engineeringCost += calculateCost('wall_plaster', inputs.wall_plaster);
    engineeringCost += calculateCost('ground_leveling', inputs.ground_leveling);
    engineeringCost += calculateCost('waterproof', inputs.waterproof);
    engineeringCost += calculateCost('tile_paste_ground', inputs.tile_paste_ground);
    engineeringCost += calculateCost('tile_paste_wall', inputs.tile_paste_wall);
    // 水泥砂浆辅料与铺贴面积挂钩
    const tileArea = inputs.tile_paste_ground + inputs.tile_paste_wall;
    engineeringCost += calculateCost('cement_mortar', tileArea);

    // 木作工程
    engineeringCost += calculateCost('ceiling_flat', inputs.ceiling_flat);
    engineeringCost += calculateCost('ceiling_shaped', inputs.ceiling_shaped);
    engineeringCost += calculateCost('cabinet_projection', inputs.cabinet_projection);
    engineeringCost += calculateCost('cabinet_unfold', inputs.cabinet_unfold);

    // 油漆工程
    engineeringCost += calculateCost('wall_paint', inputs.wall_paint);

    // 水电工程
    engineeringCost += calculateCost('water_electric', inputs.building_area);

    // 垃圾清理与成品保护，按面积计算，但受系数影响
    engineeringCost += calculateCost('debris_removal', inputs.building_area);
    
    // 固定费用，不受系数影响
    engineeringCost += calculateCost('material_handling', 1, true);

    // --- 计算附加费用 ---
    // 工程管理费 (基于工程款小计的8%)
    const managementFee = engineeringCost * 0.08;
    if (managementFee > 0) {
        budgetItems.push({
            name: '工程管理费',
            quantity: `工程款 ${engineeringCost.toFixed(2)}`,
            unit: '8%',
            price: managementFee.toFixed(2),
            total: managementFee.toFixed(2)
        });
    }
    let totalCost = engineeringCost + managementFee;

    const materialManagementFeeRate = inputs.material_management_fee_rate / 100;
    const tileWastageRate = inputs.tile_wastage_rate / 100;
    const taxRate = inputs.tax_rate / 100;

    // 主材跟进管理费 (基于工程款小计)
    const materialManagementFee = engineeringCost * materialManagementFeeRate;
    if (materialManagementFee > 0) {
        budgetItems.push({
            name: '主材跟进管理费',
            quantity: `工程款 ${engineeringCost.toFixed(2)}`,
            unit: `${(materialManagementFeeRate * 100).toFixed(1)}%`,
            price: materialManagementFee.toFixed(2),
            total: materialManagementFee.toFixed(2)
        });
        totalCost += materialManagementFee;
    }

    // 瓷砖铺贴损耗费 (基于瓷砖人工费)
    const groundTileItem = budgetItems.find(item => item.name === comprehensivePrices.tile_paste_ground.name);
    const wallTileItem = budgetItems.find(item => item.name === comprehensivePrices.tile_paste_wall.name);
    const tileLaborCost = (parseFloat(groundTileItem?.total) || 0) + (parseFloat(wallTileItem?.total) || 0);
    const tileWastageFee = tileLaborCost * tileWastageRate;
    if (tileWastageFee > 0) {
        budgetItems.push({
            name: '瓷砖铺贴损耗费',
            quantity: `瓷砖人工 ${tileLaborCost.toFixed(2)}`,
            unit: `${(tileWastageRate * 100).toFixed(1)}%`,
            price: tileWastageFee.toFixed(2),
            total: tileWastageFee.toFixed(2)
        });
        totalCost += tileWastageFee;
    }

    // 税金
    const taxFee = totalCost * taxRate;
    if (taxFee > 0) {
        budgetItems.push({ name: '装修税金', quantity: `${(taxRate * 100).toFixed(1)}%`, unit: '项', price: taxFee.toFixed(2), total: taxFee.toFixed(2) });
        totalCost += taxFee;
    }


    // --- 生成并显示结果表格 ---
    const resultDiv = document.getElementById('budget-result');
    const projectName = document.getElementById('projectName').value || '我的装修项目';
    const buildingArea = inputs.building_area;

    let tableHTML = `
        <h3>${projectName} - 预算明细</h3>
        <p>建筑面积: ${buildingArea} m²</p>
        <table>
            <thead>
                <tr><th>项目名称</th><th>工程量</th><th>单位</th><th>单价(元)</th><th>合计(元)</th></tr>
            </thead>
            <tbody>`;

    budgetItems.forEach(item => {
        tableHTML += `<tr><td>${item.name}</td><td>${item.quantity}</td><td>${item.unit}</td><td>${item.price}</td><td>${item.total}</td></tr>`;
    });

    tableHTML += `<tr class="total-row"><td colspan="4"><strong>工程款小计</strong></td><td><strong>${engineeringCost.toFixed(2)}</strong></td></tr>`;
    tableHTML += `<tr class="total-row"><td colspan="4"><strong>总计</strong></td><td><strong>${totalCost.toFixed(2)}</strong></td></tr>`;
    tableHTML += '</tbody></table>';

    resultDiv.innerHTML = tableHTML;
    document.getElementById('result-container').classList.remove('hidden');
});