<CardFooter className="p-4 pt-0 space-y-3">
  {/* Основные кнопки - показываем только если НЕТ кнопок модерации */}
  {!showModerationActions && (
    <div className="flex space-x-2 w-full">
      <Button 
        onClick={() => setContactModalOpen(true)}
        className="flex-1 bg-blue-600 hover:bg-blue-700 text-sm"
        disabled={user?.id === car.createdBy}
      >
        <Eye className="h-4 w-4 mr-2" />
        Подробнее
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => setContactModalOpen(true)}
        disabled={user?.id === car.createdBy}
        className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
      >
        <Phone className="h-4 w-4" />
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => setContactModalOpen(true)}
        disabled={user?.id === car.createdBy}
        className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
      >
        <MessageCircle className="h-4 w-4" />
      </Button>
    </div>
  )}

  {/* Кнопки модерации - показываем ВМЕСТО основных кнопок */}
  {showModerationActions && (user?.role === 'moderator' || user?.role === 'admin') && (
    <div className="space-y-2 w-full">
      {/* Кнопка "Подробнее" для модераторов */}
      <div className="flex space-x-2 w-full">
        <Button 
          onClick={() => setContactModalOpen(true)}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-sm"
        >
          <Eye className="h-4 w-4 mr-2" />
          Подробнее
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setContactModalOpen(true)}
          className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
        >
          <Phone className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setContactModalOpen(true)}
          className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
        >
          <MessageCircle className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Кнопки модерации на отдельной строке */}
      <div className="flex space-x-2 w-full">
        <Button
          onClick={() => handleModeration('approve')}
          disabled={moderateCarMutation.isPending}
          className="flex-1 bg-green-600 hover:bg-green-700 text-sm"
        >
          <Check className="h-4 w-4 mr-2" />
          Одобрить
        </Button>
        
        <Button
          onClick={() => handleModeration('reject')}
          disabled={moderateCarMutation.isPending}
          className="flex-1 bg-red-600 hover:bg-red-700 text-sm"
        >
          <X className="h-4 w-4 mr-2" />
          Отклонить
        </Button>
      </div>
    </div>
  )}

  {/* Кнопки для владельца - показываем только в режиме редактирования */}
  {showEditButton && canEdit && !showModerationActions && (
    <div className="flex space-x-2 w-full">
      <Button
        variant="outline"
        onClick={() => setEditModalOpen(true)}
        className="flex-1 bg-slate-700 border-slate-600 text-white hover:bg-slate-600 text-sm"
      >
        <Edit className="h-4 w-4 mr-2" />
        Редактировать
      </Button>
      
      {canDelete && (
        <Button
          variant="outline"
          onClick={handleDeleteClick}
          disabled={deleteCarMutation.isPending}
          className="bg-red-600 border-red-600 text-white hover:bg-red-700"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  )}
</CardFooter>
